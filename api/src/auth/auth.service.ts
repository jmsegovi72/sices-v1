import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES, SystemModules } from '@/common/constants';
import { ModulePermissions } from '@/common/constants/module-permissions';
import { qwikMessageResponse } from '@/common/helpers';
import { ErrorHandlerService } from '@/common/services/error-handler.service';
import { RolesAccessLevel, UserFromView, ValidRoles, ValidUserType } from '@/common/types';
import { PrismaService } from '@/prisma/prisma.service';
import { ChangePasswordDto, LoginUserDto } from './dto';
import { JwtPayload } from './interfaces';

// Define el tipo justo antes de la clase
export type ExpiresInType = string | number;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    // Esto hace que cada log diga [AuthService] en la consola
    this.logger.setContext(AuthService.name);
  }
  /**
   * 🔍 Obtiene usuario desde la VIEW
   * Seguridad: mensaje genérico si no existe
   */
  private async findUser(username: string) {
    const user = await this.errorHandler.handleDbQuery(
      this.prisma.viewUser.findUnique({
        where: { username },
      }),
      AuthService.name,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales no válidas');
    }

    return user;
  }
  /**
   * 🔐 Valida:
   * - Activo
   * - Bloqueo
   * - Limpia bloqueo expirado
   */
  private async checkUserStatus(user: UserFromView) {
    // 🔹 Usuario inactivo
    if (!user.isActive) {
      throw new UnauthorizedException(
        qwikMessageResponse({
          success: false,
          message: 'Tu cuenta está desactivada. Contacta al administrador.',
          errorCode: 'UNAUTHORIZED',
        }),
      );
    }

    if (user.lockedUntil) {
      // Usamos marcas de tiempo UTC directas ya que Prisma escribe y lee fechas en UTC de forma consistente.
      const lockTime = new Date(user.lockedUntil).getTime();
      const currentTime = Date.now();

      // 🔄 Limpiar bloqueo expirado
      if (lockTime <= currentTime) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
          },
        });

        // 🔥 IMPORTANTE: devolver usuario de la vista actualizado
        const updatedUser = await this.prisma.viewUser.findUnique({
          where: { id: user.id },
        });
        return updatedUser;
      }

      // 🔒 Usuario bloqueado
      if (lockTime > currentTime) {
        // Formateamos la fecha directamente (toLocaleTimeString convierte automáticamente a la hora local del proceso)
        const adjustedLockDate = new Date(user.lockedUntil);
        const formattedTime = adjustedLockDate.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        });

        throw new ForbiddenException(
          qwikMessageResponse({
            success: false,
            message: `Cuenta bloqueada temporalmente. Intente nuevamente después de las ${formattedTime}.`,
            errorCode: 'FORBIDDEN',
          }),
        );
      }
    }

    return user; // 🔥 siempre devuelve user válido
  }
  /**
   * 🔑 Compara contraseña con bcrypt
   */
  private async validatePassword(
    plain: string,
    hash: string | null,
  ): Promise<boolean> {
    if (!hash) return false;

    return await bcrypt.compare(plain, hash);
  }
  /**
   * 🔐 Manejo de intentos fallidos
   *
   * Qué hace:
   * - Incrementa intentos de forma atómica (evita desincronización)
   * - Aplica bloqueo al alcanzar el límite
   * - Devuelve info opcional para UX (intentos restantes / bloqueo)
   */
  private async handleFailedLogin(user: UserFromView) {
    const MAX_ATTEMPTS = 5;
    const LOCK_MINUTES = 15;

    // 🔹 1. Incremento atómico
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: { increment: 1 },
      },
      select: {
        loginAttempts: true,
      },
    });

    // 🔹 2. Calcular intentos (cap en MAX)
    const attempts = Math.min(updated.loginAttempts, MAX_ATTEMPTS);

    let lockedUntil: Date | null = null;

    // 🔒 3. Aplicar bloqueo si alcanza el límite
    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: MAX_ATTEMPTS, // 🔐 evitar que siga subiendo
          lockedUntil,
        },
      });
    }

    // 🔹 4. UX opcional (no expone demasiado)
    return {
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts),
      isLocked: !!lockedUntil,
      lockedUntil,
    };
  }

  /**
   * ✅ Limpia intentos y bloqueo
   */
  private async handleSuccessfulLogin(user: UserFromView) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
  /**
   * 🎟️ Genera JWT y retorna usuario
   */
  private generateAuthResponse(user: UserFromView) {
    const payload: JwtPayload = {
      id: user.id,
      role: user.roleName as ValidRoles,
      userType: user.userTypeCode as ValidUserType,
    };

    const permissions = this.calculatePermissions(user.roleName as ValidRoles, user.userTypeCode as ValidUserType);

    return {
      user: this.mapUser(user),
      token: this.getJwtToken(payload),
      permissions,
    };
  }
  /*============================================================
      🛠️ method: mapUser
      Propósito: Limpiar y transformar los datos de la Vista
      antes de enviarlos al Frontend.
  ============================================================*/
  private mapUser(user: UserFromView) {
    const {
      password,
      loginAttempts,
      lockedUntil,
      isActive,
      isFirstLogin,
      ...rest
    } = user;

    return {
      ...rest,
      isActive: !!isActive,
      firstLogin: !!isFirstLogin,
      // Los campos de userType ya van en el '...rest' de forma plana 🚀
    };
  }

  /* ============================================================
     🎟️ GENERACIÓN DE TOKEN
  ============================================================ */
  /**
   * Genera un token JWT firmado.
   * @param payload - Información del usuario a encriptar.
   * @param expiresIn - Tiempo de vida opcional (sobreescribe la config global).
   */
  private getJwtToken(payload: JwtPayload, expiresIn?: ExpiresInType): string {
    // 1. Prioridad: Parámetro > Configuración .env > Valor por defecto (4h)
    const expiration =
      expiresIn ??
      this.configService.get<ExpiresInType>('JWT_EXPIRATION', '4h');

    // 2. Firmar el token usando el JwtService inyectado
    return this.jwtService.sign(payload, {
      expiresIn: expiration as any, // Usamos 'as any' para evitar conflictos de tipos de NestJS
    });
  }
  /* ============================================================
      👤 VALIDACIÓN PARA ESTRATEGIA (JwtStrategy)
      Propósito: Re-validar al usuario en cada petición protegida.
  ============================================================ */
  async validateUser(id: number) {
    // 1. Buscamos directamente en la VISTA usando el ID del token
    const user = await this.errorHandler.handleDbQuery(
      this.prisma.viewUser.findUnique({
        where: { id },
      }),
      AuthService.name,
    );

    // 2. Verificamos existencia
    if (!user) {
      throw new UnauthorizedException(
        'Acceso denegado: Usuario no encontrado.',
      );
    }

    // 3. Verificamos estado (Ahora con el mensaje usando el fullName de la View)
    if (!user.isActive) {
      throw new UnauthorizedException(
        `El usuario ${user.fullName} se encuentra inactivo. Contacte al administrador.`,
      );
    }

    // 4. Devolvemos el usuario mapeado (Limpio de datos sensibles)
    return this.mapUser(user);
  }

  /* ============================================================
    🧑‍💻 LOGIN PRINCIPAL
   Orquesta el flujo de autenticación sin lógica compleja interna
    ============================================================ */
  async login(loginUserDto: LoginUserDto) {
    const { login, password } = loginUserDto;

    // 🔹 1. Buscar usuario
    const user = await this.findUser(login);

    // 🔹 2. Validar estado (y obtener usuario actualizado si se desbloqueó)
    const activeUser = (await this.checkUserStatus(user)) as UserFromView;

    // 🔹 3. Validar contraseña usando el usuario activo
    const isMatch = await this.validatePassword(password, activeUser.password);

    if (!isMatch) {
      await this.handleFailedLogin(activeUser);

      throw new UnauthorizedException(
        qwikMessageResponse({
          success: false,
          message: APP_MESSAGES.error.AUTH.INVALID,
          errorCode: 'UNAUTHORIZED',
        }),
      );
    }

    // 🔹 4. PRIMER LOGIN
    if (activeUser.isFirstLogin) {
      const tempToken = this.getJwtToken(
        { id: activeUser.id, isTemp: true },
        '10m',
      );

      return qwikMessageResponse({
        success: false, // 👈 importante (flujo incompleto)
        message: APP_MESSAGES.error.AUTH.CHANGE_PASSWORD,
        token: tempToken,
        data: {
          requiresPasswordChange: true,
        },
      });
    }

    // 🔹 5. Login exitoso
    await this.handleSuccessfulLogin(activeUser);

    // 🔹 6. Respuesta final
    return this.generateAuthResponse(activeUser);
  }
  /*============================================================
  🔐 method: changePassword (Bulletproof Version)
============================================================*/
  async changePassword(id: number, dto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = dto;

    // 🔹 1. Validaciones (fail-fast)
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'La nueva contraseña y la confirmación no coinciden.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'La nueva contraseña no puede ser igual a la actual.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 🔹 2. Buscar usuario
    const user = await this.errorHandler.handleDbQuery(
      this.prisma.user.findUnique({ where: { id } }),
      AuthService.name,
    );

    if (!user) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: 'Usuario no encontrado.',
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 🔹 3. Validar estado
    if (!user.isActive) {
      throw new UnauthorizedException(
        qwikMessageResponse({
          success: false,
          message: 'Tu cuenta está desactivada. Contacta al administrador.',
          errorCode: 'UNAUTHORIZED',
        }),
      );
    }

    // 🔹 4. Validar contraseña actual
    const isPasswordPlain = !user.password.startsWith('$2b$');
    const isMatch = isPasswordPlain
      ? user.password === currentPassword
      : await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new UnauthorizedException(
        qwikMessageResponse({
          success: false,
          message: 'La contraseña actual es incorrecta.',
          errorCode: 'UNAUTHORIZED',
        }),
      );
    }

    // 🔹 5. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔹 6. Actualizar
    await this.errorHandler.handleDbQuery(
      this.prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          isFirstLogin: false,
          loginAttempts: 0,
          lockedUntil: null,
          updatedBy: id,
        },
      }),
      AuthService.name,
    );

    // 🔹 7. Obtener usuario actualizado desde la VIEW
    const updatedUser = await this.prisma.viewUser.findUnique({
      where: { id },
    });

    if (!updatedUser) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: 'Usuario no encontrado tras la actualización.',
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 🔹 8. Generar nuevo token normal y respuesta de autenticación
    const authResponse = this.generateAuthResponse(updatedUser);

    // 🔹 9. Respuesta final con token y datos de usuario
    return qwikMessageResponse({
      success: true,
      message: APP_MESSAGES.success.AUTH.PASSWORD_CHANGED,
      data: {
        user: authResponse.user,
      },
      token: authResponse.token,
    });
  }
  /*============================================================
      🛠️ method: checkStatus
      Propósito: Refrescar la sesión y devolver datos frescos
  ============================================================*/
  public checkStatus(user: UserFromView) {
    const permissions = this.calculatePermissions(user.roleName as ValidRoles, user.userTypeCode as ValidUserType);
    return {
      user: this.mapUser(user), // Aquí sí podemos usar el privado
      token: this.getJwtToken({ id: user.id }), // Renovamos el token 🚀
      permissions,
    };
  }

  /**
   * 🔒 Calcula los permisos por módulo basados en el Rol y Tipo de Usuario
   */
  private calculatePermissions(role: ValidRoles, userType: ValidUserType) {
    const permissions: Record<string, string[]> = {};
    const modules = Object.values(SystemModules) as SystemModules[];

    // Mapeo de nombre de módulo al formato camelCase esperado por el frontend
    const moduleKeyMap: Record<SystemModules, string> = {
      [SystemModules.USERS]: 'users',
      [SystemModules.PERSONS]: 'persons',
      [SystemModules.GRADES]: 'grades',
      [SystemModules.ENROLLMENTS]: 'enrollments',
      [SystemModules.CLASSES]: 'classes',
      [SystemModules.ZIP_CODES]: 'zipCodes',
      [SystemModules.ADDRESSES]: 'addresses',
      [SystemModules.STUDENTS]: 'students',
      [SystemModules.SCHOOLS_OF_ORIGIN]: 'schoolsOfOrigin',
      [SystemModules.DEMOGRAPHICS]: 'demographics',
      [SystemModules.EMERGENCY_CONTACTS]: 'emergencyContacts',
      [SystemModules.STUDENT_ACADEMIC_BACKGROUNDS]: 'studentAcademicBackgrounds',
      [SystemModules.STAFF]: 'staff',
      [SystemModules.TEACHING_LOAD]: 'teachingLoad',
    };

    for (const module of modules) {
      const allowedActionsForType = ModulePermissions[module]?.[userType] || [];
      const modulePermissions: string[] = [];

      // 1. Validar lectura (dbLimitedDataReader)
      const allowedRolesForRead = RolesAccessLevel.dbLimitedDataReader as readonly string[];
      if (allowedRolesForRead.includes(role) && allowedActionsForType.includes('read')) {
        modulePermissions.push('read');
      }

      // 2. Validar escritura (dbLimitedDataWriter)
      const allowedRolesForWrite = RolesAccessLevel.dbLimitedDataWriter as readonly string[];
      const hasWriteAction = allowedActionsForType.some(action =>
        ['create', 'update', 'delete'].includes(action),
      );
      if (allowedRolesForWrite.includes(role) && hasWriteAction) {
        modulePermissions.push('write');
      }

      const frontendKey = moduleKeyMap[module];
      if (frontendKey) {
        permissions[frontendKey] = modulePermissions;
      }
    }

    return permissions;
  }
}
