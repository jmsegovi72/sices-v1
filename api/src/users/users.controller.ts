import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Auth, GetUser } from '@/auth/decorators';
import { EnumRoles } from '@/common';
import { ACCESS_LEVEL } from '@/common/constants';
import { PaginationDto, SearchDto } from '@/common/dtos';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  ValidateTempPasswordDto,
} from './dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /* ============================================================
     👤 CREATE USER (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que vincula al creador con el nuevo
        registro para fines de auditoría institucional.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbOwner) // Mantenemos su nivel de acceso dbOwner
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView, // 👈 Ahora capturamos al admin que realiza la acción
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<any>> {
    // Enviamos el objeto empaquetado al service siguiendo el patrón de Students
    return await this.usersService.create({
      userId: user.id, // 🆔 El ID del administrador (Auditoría)
      dto: createUserDto, // 📝 Los datos del nuevo usuario
      options: {
        returnData: true, // 🔓 Retornamos el objeto creado (será sanitizado en el servicio)
      },
    });
  }
  /* ============================================================
    🔍 findAll()
    ------------------------------------------------------------
    📌 Descripción:
    Endpoint para obtener una lista paginada de todos los
    usuarios, consultando la vista 'vwUsers'.
    Acceso restringido según nivel de seguridad.

    🧠 Flujo:
    1️⃣ Valida permisos mediante el decorador @Auth.
    2️⃣ Transforma y valida Query Params (page, limit) vía PaginationDto.
    3️⃣ Ejecuta la consulta centralizada en el servicio.

    ⚙️ Parámetros:
    - paginationDto: Contiene la lógica de safeLimit y offset.
   ============================================================ */
  @Get('list')
  @UseInterceptors(TransformDataInterceptor) // 👈 Limpia BigInt y Formatea Fechas
  @HttpCode(HttpStatus.OK)
  @Auth(ACCESS_LEVEL.dbOwner) // 🛡️ Seguridad nivel dbOwner
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<UserFromView[]>> {
    // Al llegar aquí, paginationDto ya pasó por los decoradores:
    // @OptionalNonNegativeInt y @OptionalPositiveInt.

    return await this.usersService.findAll<UserFromView>(paginationDto);
  }

  /* ============================================================
     👥 FindMany
     ------------------------------------------------------------
     📌 Endpoint: GET /users
     Permite filtrado avanzado por Rol, Tipo de Usuario y Estado.
     ============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbOwner)
  @UseInterceptors(TransformDataInterceptor) // 👈 Limpieza de BigInt y Formato de Fechas
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filter: QueryUserDto,
  ): Promise<ApiResponse<UserFromView[]>> {
    // Ejecutamos la búsqueda masiva usando el tipo de la vista de Prisma
    return await this.usersService.findMany<UserFromView>(filter);
  }

  /* ============================================================
     🔍 FIND ONE USER BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Descripción:
     Endpoint para buscar un único usuario (de la vista `VwUsers`)
     usando un término de búsqueda flexible (ID, email o CURP).
     Protegido y accesible solo por `ACCESS_LEVEL.dbOwner`.
     ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor) // 👈 Limpia BigInt y Formatea Fechas
  @Auth(ACCESS_LEVEL.dbOwner)
  @HttpCode(HttpStatus.OK)
  async findOneBy(
    @Param('search') search: string,
    @Query('light') light?: string,
  ) {
    // 1️⃣ Transformamos el string de la URL en la estructura del DTO
    const searchDto = plainToClass(SearchDto, { search });

    // 2️⃣ IMPORTANTE: Validamos manualmente el DTO transformado
    // Esto disparará el @Transform y validaciones internas de tu SearchDto
    try {
      await validateOrReject(searchDto);
    } catch {
      // Si el formato no es ID, CURP o Email válido, lanzamos el 400
      throw new BadRequestException(
        'El término de búsqueda no tiene un formato válido.',
      );
    }

    // 3️⃣ Llamada al servicio con el DTO validado
    return await this.usersService.findOneBy<UserFromView>({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbOwner)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.usersService.update({
      id,
      userId: user.id, // Para la auditoría 'updatedBy'
      dto: updateUserDto,
      options: {
        returnData: false, // No retorna el usuario en el body de respuesta
      },
    });
  }

  /* ============================================================
     📷 METHOD: updatePhoto
     ------------------------------------------------------------
     📌 Descripción: 
     Sube y actualiza la foto de perfil del usuario (formato PNG, nombrada con CURP).
     Acceso exclusivo para administradores (dbOwner).
     ============================================================ */
  @Patch('photo/:id')
  @Auth(ACCESS_LEVEL.dbOwner)
  @UseInterceptors(FileInterceptor('photo'))
  async updatePhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: UserFromView,
  ) {
    return await this.usersService.updatePhoto(id, file, user);
  }

  /* ============================================================
     🔄 PATCH: users/:id/status
     ------------------------------------------------------------
     📌 Descripción: 
     Ruta administrativa para activar o desactivar usuarios.
     No requiere body, la lógica se resuelve mediante el ID.
     ============================================================ */
  @Patch('toggle-active/:id')
  @Auth(ACCESS_LEVEL.dbOwner)
  async toggleStatus(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory: () => {
          return new BadRequestException(
            'El ID proporcionado debe ser un número válido.',
          );
        },
      }),
    )
    id: number,
    @GetUser('id') adminId: number,
  ) {
    return await this.usersService.toggleActive(id, adminId);
  }

  /* ============================================================
     🔑 PATCH: users/set-first-login-true/:id
     ------------------------------------------------------------
     📌 Descripción: 
     Comando administrativo para resetear el acceso de un usuario.
     Permite enviar una clave manual o generarla automáticamente.
     ============================================================ */
  @Patch('set-first-login-true/:id')
  @Auth(ACCESS_LEVEL.dbOwner)
  async resetPasswordStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: ValidateTempPasswordDto,
    @GetUser('id') adminId: number,
  ) {
    return await this.usersService.setFirstLoginTrue(id, dto, adminId);
  }

  /* ============================================================
     🔒 PATCH: users/unlock/:id
     ------------------------------------------------------------
     📌 Descripción: 
     Ruta administrativa para desbloquear manualmente una cuenta bloqueada.
     ============================================================ */
  @Patch('unlock/:id')
  @Auth(ACCESS_LEVEL.dbOwner)
  async unlock(
    @Param('id', ParsePositiveIntPipe) id: number,
    @GetUser('id') adminId: number,
  ) {
    return await this.usersService.unlock(id, adminId);
  }
}
