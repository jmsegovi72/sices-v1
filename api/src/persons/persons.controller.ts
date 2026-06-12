import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Auth, AuthModulePermission, GetUser } from '@/auth/decorators';
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { PaginationDto, SearchDto } from '@/common/dtos';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import {
  CreateManyPersonDto,
  CreatePersonDto,
  QueryPersonDto,
  UpdatePersonDto,
} from './dto';
import { PersonsService } from './persons.service';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  /* ============================================================
     👤 CREATE PERSON (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra una persona utilizando:
     - CURP como fuente de verdad
     - Municipio obligatorio → estado derivado
     - RFC generado automáticamente
     - Auditoría del usuario que realiza la acción
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter) // 🔄 Ajuste correcto de permisos
  @AuthModulePermission(SystemModules.PERSONS, 'create') // 🔥 NUEVO
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createPersonDto: CreatePersonDto,
  ): Promise<ApiResponse<any>> {
    return await this.personsService.create({
      userId: user.id,
      dto: createPersonDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
 👥 CREATE MANY PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint protegido para inserción masiva de personas.

 - Procesa múltiples registros en una sola operación
 - Usa CURP como fuente de verdad
 - Municipio obligatorio → estado derivado
 - RFC generado automáticamente
 - Auditoría del usuario que realiza la acción
============================================================ */
  @Post('/batch')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.PERSONS, 'create') // 🔥 NUEVO
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyPersonDto: CreateManyPersonDto,
  ): Promise<ApiResponse<void>> {
    return await this.personsService.createMany({
      userId: user.id,
      dto: createManyPersonDto,
    });
  }

  /* ============================================================
 📋 FIND ALL PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint protegido para obtener listado de personas.

 - Usa paginación segura
 - Consulta desde la vista ViewPersons
 - No requiere mapper (datos ya limpios desde DB)
 - El interceptor transforma BigInt y fechas
============================================================ */
  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.PERSONS, 'read') // 🔥 NUEVO
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.personsService.findAll(paginationDto);
  }

  /* ============================================================
 📋 FIND MANY PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Endpoint para listar personas con filtros dinámicos,
 paginación segura y control de acceso por módulo.
============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter) // 🔓
  @AuthModulePermission(SystemModules.PERSONS, 'read') // 🔥 control por módulo
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryPersonDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.personsService.findMany(filters);
  }

  /* ============================================================
     🗺️ GET SEARCH CATALOGS (SICES V3)
     ------------------------------------------------------------
     📌 Descripción:
     Endpoint público que devuelve el catálogo de estados y 
     municipios con personas registradas para filtrado en frontend.
     ============================================================ */
  @Get('search-catalogs')
  @HttpCode(HttpStatus.OK)
  async getSearchCatalogs(): Promise<ApiResponse<any>> {
    return await this.personsService.getSearchCatalogs();
  }

  /* ============================================================
 🔍 FIND ONE PERSON BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Endpoint para buscar una persona (de la vista `viewPersons`)
 usando un término flexible (ID, CURP o Email).
 Protegido por rol + permisos por módulo.
============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter) // 🔒 tu decisión de negocio
  @AuthModulePermission(SystemModules.PERSONS, 'read') // 🔥 NUEVO
  @HttpCode(HttpStatus.OK)
  async findOneBy(
    @Param('search') search: string,
    @Query('light') light?: string,
  ) {
    // 1️⃣ Transformar string → DTO
    const searchDto = plainToClass(SearchDto, { search });

    // 2️⃣ Validar DTO
    try {
      await validateOrReject(searchDto);
    } catch {
      throw new BadRequestException(
        'El término de búsqueda no tiene un formato válido.',
      );
    }

    // 3️⃣ Llamar al service
    return await this.personsService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
   ✏️ UPDATE PERSON (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido que actualiza una persona utilizando:
   - CURP como fuente de verdad (si se modifica)
   - Recalculo automático de datos demográficos
   - Auditoría del usuario que realiza la acción
   - Control de acceso por módulo (PERSONS:update)
   ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.PERSONS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParsePositiveIntPipe) id: number,
    @GetUser() user: UserFromView,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<ApiResponse<any>> {
    return await this.personsService.update({
      id,
      dto: updatePersonDto,
      userId: user.id,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     📷 METHOD: updatePhoto
     ------------------------------------------------------------
     📌 Descripción: 
     Sube y actualiza la foto de perfil de la persona (formato PNG, nombrada con CURP).
     Acceso para usuarios autorizados a nivel de actualización de Personas.
     ============================================================ */
  @Patch('photo/:id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.PERSONS, 'update')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePhoto(
    @Param('id', ParsePositiveIntPipe) id: number,
    @UploadedFile() file: any,
    @GetUser() user: UserFromView,
  ) {
    return await this.personsService.updatePhoto(id, file, user);
  }
}
