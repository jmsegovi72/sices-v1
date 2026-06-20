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
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { PaginationDto, SearchDto } from '@/common/dtos';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import { AddressesService } from './addresses.service';
import { CreateManyAddressDto, QueryAddressDto } from './dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /* ============================================================
     🏠 CREATE ADDRESS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra una dirección.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<ApiResponse<any>> {
    return await this.addressesService.create({
      userId: user.id,
      dto: createAddressDto,
      options: {
        returnData: true,
      },
    });
  }

  /* ============================================================
   🆕 CREATE MANY ADDRESSES (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido para inserción masiva de direcciones.
   ============================================================ */
  @Post('/bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyAddressDto: CreateManyAddressDto,
  ): Promise<ApiResponse<void>> {
    return await this.addressesService.createMany({
      userId: user.id,
      dto: createManyAddressDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
 📋 FIND ALL ADDRESSES (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint protegido para obtener listado de direcciones.
 - Usa paginación segura
 - Consulta desde la vista ViewAddress
 - No requiere mapper (datos ya limpios desde DB)
 - El interceptor transforma BigInt y fechas
============================================================ */
  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.addressesService.findAll(paginationDto);
  }
  /* ============================================================
📋 QUERY ADDRESSES (SICES V3)
------------------------------------------------------------
📌 Endpoint para listar direcciones con filtros dinámicos,
paginación segura y control de acceso por módulo.
============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryAddressDto,
  ): Promise<ApiResponse<any[]>> {
    // 🚀 Cero manipulación de IDs aquí, directo al service con los filtros de nombres
    return await this.addressesService.findMany(filters);
  }

  /* ============================================================
 🔍 FIND ONE ADDRESS BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint para buscar una dirección (de la vista ViewAddress)
 usando un término flexible (ID o CURP).
============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'read')
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
    return await this.addressesService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
  ✏️ UPDATE ADDRESS (SICES V3)
  ------------------------------------------------------------
  📌 Endpoint protegido que actualiza una dirección física.
  ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ADDRESSES, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<ApiResponse<any>> {
    // 🚀 Pasamos el userId para la relación de auditoría y el id de la dirección
    return await this.addressesService.update({
      userId: user.id,
      id,
      dto: updateAddressDto,
      options: {
        returnData: true, // Mismo comportamiento que en ZipCodes
      },
    });
  }
}
