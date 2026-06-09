import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ViewUser } from '@prisma/client';
import { hashSync } from 'bcrypt';
import { plainToClass } from 'class-transformer';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { PaginationDto, SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractCreateParams,
  extractFindParams,
  extractUpdateParams,
  httpRequestCreate,
  httpRequestFindMany,
  httpRequestFindUnique,
  httpRequestUpdate,
  mapUserResponse,
  qwikMessageResponse,
  resolvePagination,
} from '@/common/helpers';
import {
  ApiResponse,
  CreateEntityParams,
  FindEntityParams,
  UpdateEntityParams,
} from '@/common/interfaces';

import { TypeWhereFieldMap, UserFromView } from '@/common/types';
import { generateStrictTempPassword } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { UploadsService } from '@/uploads';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  ValidateTempPasswordDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly uploadsService: UploadsService,
  ) {}

  /* ============================================================
   👤 CREATE USER (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea un nuevo usuario utilizando el extractor de parámetros
   para soportar transacciones y auditoría.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateUserDto>,
  ): Promise<ApiResponse<T> & { tempPassword: string; userId?: number }> {
    // 🔹 1. Extraer parámetros (soporta transacciones)
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { username: data.username, createdBy: userId },
      'Iniciando creación de usuario',
    );

    // 🔹 2. Preparar contraseña
    const { password, username, ...rest } = data;

    // 🛡️ Si no viene password, generamos temporal
    const plainPassword = password || generateStrictTempPassword();

    const dtoToSave = {
      ...rest,
      username,
      password: hashSync(plainPassword, 10),
      photoUrl: '/uploads/users/default-avatar.png',
      createdBy: userId,
    };

    // 🔹 3. Crear registro
    const result = await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: UsersService.name,
      methodName: 'create',
      model: client.user,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });

    if (result.data) {
      result.data = mapUserResponse(result.data) as T;
    }

    // 🔹 4. Obtener ID del usuario recién creado
    const created = await this.prisma.user.findFirst({
      where: { username },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    // 🔹 5. Adjuntar password temporal e ID (solo para admin)
    return {
      ...result,
      tempPassword: plainPassword,
      userId: created?.id,
    };
  }
  /* ============================================================
   📋 FIND ALL USERS (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Obtiene un listado de usuarios desde la vista 'vwUsers'.
   Usa paginación segura y respuesta estandarizada.
   ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Extraer paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construir query
    const queryOptions: Prisma.ViewUserFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: {
        fullName: 'asc',
      },
    };

    // 🔹 3. Ejecutar helper genérico
    const response = await httpRequestFindMany<T>({
      serviceName: UsersService.name,
      model: this.prisma.viewUser,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });

    // 🔹 4. Mapear respuesta
    if (response.data?.length) {
      response.data = response.data.map((user) => mapUserResponse(user) as T);
    }

    return response;
  }

  /* ============================================================
 👥 method: findMany (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Listado masivo con filtros administrativos por Rol y Tipo.
============================================================ */

  async findMany<T>(filters: QueryUserDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción dinámica WHERE
    const whereCondition = buildWhereMany<
      Prisma.ViewUserWhereInput,
      QueryUserDto
    >(filters, {
      /**
       * 🔥 Si existe searchTerm:
       * ignorar filtros contains.
       */
      searchTermMode: true,
      // 🔹 Búsquedas específicas
      contains: {
        firstName: 'firstName',
        firstLastName: 'firstLastName',
        secondLastName: 'secondLastName',
        fullName: 'fullName',
      },
      // 🔹 Filtros exactos
      equals: {
        isActive: 'isActive',
        isFirstLogin: 'isFirstLogin',
        roleName: 'roleName',
        userTypeName: 'userTypeName',
      },
      // 🔹 Búsqueda global
      orSearch: ['fullName', 'username'],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewUserFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),

      where: whereCondition,

      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    };

    // 🔹 Ejecutar helper centralizado
    const response = await httpRequestFindMany<T>({
      serviceName: UsersService.name,

      model: this.prisma.viewUser,

      logger: this.logger,

      queryOptions,

      dto: filters,
    });

    // 🔹 Sanitizar respuesta
    if (response.data?.length) {
      response.data = response.data.map((user) => mapUserResponse(user)) as T[];
    }

    return response;
  }

  /* ============================================================
   🔍 FIND ONE USER BY CRITERIA (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Busca un único usuario en la vista 'viewUsers' utilizando
   mapeo dinámico y soporte para transacciones.
   ============================================================ */
  async findOneBy<T>(
    params: FindEntityParams<SearchDto>,
  ): Promise<ApiResponse<T | null>> {
    // 🔹 1. Extracción estándar
    const { searchDto, client, throwIfNotFound } = extractFindParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validación
    if (!searchDto.search) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'Se requiere un término de búsqueda válido.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    const { type, value } = searchDto.search;

    // 🔹 3. Mapeo dinámico
    const fieldMaps: TypeWhereFieldMap[] = [
      { type: 'id', field: 'id' },
      { type: 'email', field: 'username' },
    ];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.user : client.viewUser;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        username: true,
        personId: true,
        roleId: true,
        userTypeId: true,
        isActive: true,
        isFirstLogin: true,
        photoUrl: true,
        persons_users_person_idTopersons: {
          select: {
            firstName: true,
            firstLastName: true,
            secondLastName: true,
            curp: true,
          },
        },
        roles: {
          select: {
            name: true,
          },
        },
        user_types: {
          select: {
            name: true,
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const response = await httpRequestFindUnique<any>({
      serviceName: UsersService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    // 🔹 6. Mapeo de seguridad y aplanamiento
    if (response.data) {
      if (isLight) {
        const usr = response.data;
        response.data = {
          id: usr.id,
          username: usr.username,
          personId: usr.personId,
          roleId: usr.roleId,
          userTypeId: usr.userTypeId,
          isActive: !!usr.isActive,
          isFirstLogin: !!usr.isFirstLogin,
          photoUrl: usr.photoUrl,
          personName: usr.persons_users_person_idTopersons
            ? `${usr.persons_users_person_idTopersons.firstName} ${usr.persons_users_person_idTopersons.firstLastName} ${usr.persons_users_person_idTopersons.secondLastName || ''}`.trim()
            : null,
          curp: usr.persons_users_person_idTopersons?.curp ?? null,
          roleName: usr.roles?.name ?? null,
          userTypeName: usr.user_types?.name ?? null,
        };
      } else {
        response.data = mapUserResponse(response.data) as T;
      }
    }

    return response as ApiResponse<T | null>;
  }

  /* ============================================================
   ✏️ UPDATE USER (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Actualiza un usuario usando el estándar de extracción de 
   parámetros moderno. Gestiona auditoría y seguridad.
   ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateUserDto>,
  ): Promise<ApiResponse<R>> {
    // 🔹 1. Extraer parámetros
    const { idValue, data, client, returnData, idFieldName } =
      extractUpdateParams(params, this.prisma);

    // 🔹 2. Ejecutar update
    const response = await httpRequestUpdate<typeof data, R>({
      serviceName: UsersService.name,
      model: client.user,
      logger: this.logger,
      idValue,
      data,
      returnData,
      idFieldName,
    });

    // 🔹 3. Mapeo de seguridad
    if (response.data) {
      response.data = mapUserResponse(response.data) as R;
    }

    return response;
  }
  /* ============================================================
   🔄 method: toggleActive
   ------------------------------------------------------------
   📌 Descripción:
   Invierte el estado 'isActive' de un usuario.
   ============================================================ */
  async toggleActive(id: number, adminId: number): Promise<ApiResponse<any>> {
    // 🔹 1. Buscar usuario
    const user = await this.findOneBy<ViewUser>({
      searchDto: plainToClass(SearchDto, { search: id }),
    });

    if (!user.success || !user.data) {
      return qwikMessageResponse({
        success: false,
        message: APP_MESSAGES.error.USERS.NOT_FOUND(id),
        errorCode: 'NOT_FOUND',
      });
    }

    // 🔹 2. Invertir estado
    const newStatus = !user.data.isActive;

    // 🔹 3. Actualizar
    const response = await httpRequestUpdate({
      serviceName: UsersService.name,
      model: this.prisma.user,
      logger: this.logger,
      idValue: id,
      data: {
        isActive: newStatus,
        updatedBy: adminId,
      },
    });

    // 🔹 4. Respuesta personalizada
    return {
      ...response,
      message: `El usuario ${user.data.username} ha sido ${
        newStatus ? 'activado' : 'desactivado'
      } correctamente.`,
      data: {
        id,
        isActive: newStatus,
        updatedBy: adminId,
      },
    };
  }

  /* ============================================================
   🔑 method: setFirstLoginTrue
   ------------------------------------------------------------
   📌 Descripción:
   Invalida el estado de acceso actual del usuario para forzar
   un cambio de credenciales (Reset Password administrativo).
   ============================================================ */
  async setFirstLoginTrue(
    id: number,
    dto: ValidateTempPasswordDto,
    adminId: number,
  ): Promise<ApiResponse<any>> {
    const { tempPassword } = dto;

    // 🔹 1. Verificar existencia
    const user = await this.findOneBy<ViewUser>({
      searchDto: plainToClass(SearchDto, { search: id }),
    });

    if (!user.success || !user.data) {
      return qwikMessageResponse({
        success: false,
        message: APP_MESSAGES.error.USERS.NOT_FOUND(id),
        errorCode: 'NOT_FOUND',
      });
    }

    // 🔹 2. Generar contraseña temporal
    const plainPassword = tempPassword || generateStrictTempPassword();

    // 🔹 3. Actualizar usuario
    const response = await httpRequestUpdate({
      serviceName: UsersService.name,
      model: this.prisma.user,
      logger: this.logger,
      idValue: id,
      data: {
        password: hashSync(plainPassword, 10),
        isFirstLogin: true,
        updatedBy: adminId,
      },
    });

    // 🔹 4. Respuesta final (custom para admin)
    return {
      ...response,
      message: APP_MESSAGES.success.USERS.RESET_PASSWORD(user.data.username),
      data: {
        id,
        isFirstLogin: true,
        updatedBy: adminId,
        tempPassword: plainPassword, // 👈 corregido nombre (antes empPassword)
      },
    };
  }

  /* ============================================================
   🔒 method: unlock
   ------------------------------------------------------------
   📌 Descripción:
   Desbloquea manualmente una cuenta de usuario bloqueada.
   ============================================================ */
  async unlock(id: number, adminId: number): Promise<ApiResponse<any>> {
    // 🔹 1. Buscar usuario
    const user = await this.findOneBy<ViewUser>({
      searchDto: plainToClass(SearchDto, { search: id }),
    });

    if (!user.success || !user.data) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: APP_MESSAGES.error.USERS.NOT_FOUND(id),
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 🔹 2. Actualizar
    const response = await httpRequestUpdate({
      serviceName: UsersService.name,
      model: this.prisma.user,
      logger: this.logger,
      idValue: id,
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        updatedBy: adminId,
      },
    });

    return {
      ...response,
      message: `La cuenta del usuario ${user.data.username} ha sido desbloqueada correctamente.`,
      data: {
        id,
        loginAttempts: 0,
        lockedUntil: null,
        updatedBy: adminId,
      },
    };
  }

  /* ============================================================
   📷 UPDATE PHOTO (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Busca el CURP del usuario en la base de datos, llama a
   UploadsService para guardar físicamente el archivo con el nombre
   CURP.png y finalmente actualiza photoUrl en la base de datos.
   ============================================================ */
  async updatePhoto(
    id: number,
    file: Express.Multer.File,
    currentUser: UserFromView,
  ): Promise<ApiResponse<any>> {
    this.logger.info(
      { userId: id, updatedBy: currentUser.id },
      'Iniciando actualización de foto de usuario',
    );

    // 🔹 1. Buscar al usuario y su CURP
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        persons_users_person_idTopersons: {
          select: {
            curp: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: APP_MESSAGES.error.USERS.NOT_FOUND(id),
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const curp = user.persons_users_person_idTopersons?.curp;
    if (!curp) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message:
            'El usuario no tiene una CURP asociada. No se puede generar el nombre de archivo.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 🔹 2. Guardar el archivo usando UploadsService
    const sanitizedCurp = curp.trim().toUpperCase();
    const extension = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const filename = `${sanitizedCurp}${extension}`;

    const relativePath = await this.uploadsService.saveFile(
      file,
      'users', // Carpeta destino
      filename,
      ['image/png', 'image/jpeg', 'image/jpg'], // Formatos permitidos
      5, // Límite de tamaño (5MB)
    );

    // 🔹 3. Actualizar la base de datos
    await this.prisma.user.update({
      where: { id },
      data: {
        photoUrl: relativePath,
        updatedBy: currentUser.id,
      },
    });

    this.logger.info(
      { userId: id, photoUrl: relativePath },
      'Foto de usuario actualizada exitosamente',
    );

    return qwikMessageResponse({
      success: true,
      message: 'Foto de usuario actualizada correctamente.',
      data: {
        id,
        photoUrl: relativePath,
      },
    });
  }
}
