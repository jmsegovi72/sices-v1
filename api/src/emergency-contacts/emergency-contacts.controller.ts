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
  UseInterceptors,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Auth, AuthModulePermission, GetUser } from '@/auth/decorators';
import { ParsePositiveIntPipe } from '@/common';
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { SearchDto } from '@/common/dtos';
import { qwikMessageResponse } from '@/common/helpers';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import type { UserFromView } from '@/common/types';
import {
  CreateEmergencyContactDto,
  CreateManyEmergencyContactDto,
  QueryEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto';
import { EmergencyContactsService } from './emergency-contacts.service';

@Controller('emergency-contacts')
export class EmergencyContactsController {
  constructor(
    private readonly emergencyContactsService: EmergencyContactsService,
  ) {}

  /* ============================================================
    📞 CREATE EMERGENCY CONTACT (SICES V3)
    ------------------------------------------------------------
    📌 Endpoint protegido que registra un contacto de emergencia.
    ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.EMERGENCY_CONTACTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createDto: CreateEmergencyContactDto,
  ): Promise<ApiResponse<any>> {
    return await this.emergencyContactsService.create({
      userId: user.id,
      dto: createDto,
      options: {
        returnData: true,
      },
    });
  }
  /* ============================================================
    📞 CREATE MANY CONTACTS (SICES V3)
    ============================================================ */
  @Post('/bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.EMERGENCY_CONTACTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyDto: CreateManyEmergencyContactDto,
  ): Promise<ApiResponse<void>> {
    return await this.emergencyContactsService.createMany({
      userId: user.id,
      dto: createManyDto,
      options: { returnData: false },
    });
  }

  /* ============================================================
    📞 FIND MANY EMERGENCY CONTACTS (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Listado de contactos de emergencia con soporte para filtros
    y transformación de datos.
    ============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataReader)
  @AuthModulePermission(SystemModules.EMERGENCY_CONTACTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryEmergencyContactDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.emergencyContactsService.findMany(filters);
  }

  /* ============================================================
    📞 FIND ONE EMERGENCY CONTACT BY CRITERIA (SICES V3)
    ------------------------------------------------------------
    📌 Endpoint para buscar un contacto usando un término flexible 
    (ID, personId o CURP) vía URL Param.
    ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter) // Siguiendo su estándar de Demographics
  @AuthModulePermission(SystemModules.EMERGENCY_CONTACTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findOneBy(
    @Param('search') search: string,
    @Query('light') light?: string,
  ): Promise<ApiResponse<any>> {
    // 1️⃣ Transformar string de la URL → Instancia de SearchDto
    // Esto dispara la lógica del @Transform que detecta ID, CURP, etc.
    const searchDto = plainToClass(SearchDto, { search });

    // 2️⃣ Validar DTO (Asegura que el @Transform no haya fallado)
    try {
      await validateOrReject(searchDto);
    } catch {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'El término de búsqueda no tiene un formato válido.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 3️⃣ Llamar al service usando el nuevo estándar FindEntityParams
    return await this.emergencyContactsService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  // src/modules/emergency-contacts/emergency-contacts.controller.ts

  /* ============================================================
    📞 UPDATE EMERGENCY CONTACT (SICES V3)
    ------------------------------------------------------------
    📌 Endpoint para actualizar un contacto de emergencia.
    ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.EMERGENCY_CONTACTS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParsePositiveIntPipe) id: number,
    @GetUser() user: UserFromView,
    @Body() updateDto: UpdateEmergencyContactDto,
  ): Promise<ApiResponse<any>> {
    return await this.emergencyContactsService.update({
      userId: user.id, // ID del usuario que realiza la acción (para auditoría)
      id, // ID del registro a actualizar
      dto: updateDto, // Datos parciales a modificar
      options: {
        returnData: true, // Por si necesitas el registro actualizado de vuelta
      },
    });
  }
}
