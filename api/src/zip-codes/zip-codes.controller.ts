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
import { QueryZipCodeDto } from './dto';
import { CreateZipCodeDto } from './dto/create-zip-code.dto';
import { UpdateZipCodeDto } from './dto/update-zip-code.dto';
import { ZipCodesService } from './zip-codes.service';

@Controller('zip-codes')
export class ZipCodesController {
  constructor(private readonly zipCodesService: ZipCodesService) {}

  /* ============================================================
     📮 CREATE ZIP CODE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra un código postal
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ZIP_CODES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createZipCodeDto: CreateZipCodeDto,
  ): Promise<ApiResponse<any>> {
    return await this.zipCodesService.create({
      userId: user.id,
      dto: createZipCodeDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
 📋 FIND ALL ZIP CODES (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint protegido para obtener listado de códigos postales.
 - Usa paginación segura
 - Consulta desde la vista ViewZipCode
 - No requiere mapper (datos ya limpios desde DB)
 - El interceptor transforma BigInt y fechas
============================================================ */
  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ZIP_CODES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.zipCodesService.findAll(paginationDto);
  }

  /* ============================================================
 📋 FIND MANY ZIP CODES (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint para listar códigos postales con filtros dinámicos,
 paginación segura y control de acceso por módulo.
============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ZIP_CODES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryZipCodeDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.zipCodesService.findMany(filters);
  }

  /* ============================================================
 🔍 FIND ONE ZIP CODE BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint para buscar un código postal (de la vista ViewZipCode)
 usando un término flexible (ID o Código Postal).
============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ZIP_CODES, 'read')
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
    return await this.zipCodesService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
 ✏️ UPDATE ZIP CODE (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint protegido que actualiza un código postal.
============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ZIP_CODES, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateZipCodeDto: UpdateZipCodeDto,
  ): Promise<ApiResponse<any>> {
    return await this.zipCodesService.update({
      userId: user.id,
      id,
      dto: updateZipCodeDto,
      options: {
        returnData: false,
      },
    });
  }
}
