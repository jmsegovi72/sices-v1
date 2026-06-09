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
import { ClassCodeValidationPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import {
  CreateBatchStudentEnrollmentDto,
  CreateEnrollmentDto,
  QueryEnrollmentDto,
  UpdateEnrollmentDto,
} from './dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /* ============================================================
     📋 CREATE ENROLLMENT (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que inscribe un alumno en una clase.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<ApiResponse<any>> {
    return await this.enrollmentsService.create({
      userId: user.id,
      dto: createEnrollmentDto,
      options: { returnData: false },
    });
  }

  /* ============================================================
     📋 CREATE BATCH ENROLLMENTS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que inscribe alumnos por lote.
     ============================================================ */
  @Post('batch')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(
    @GetUser() user: UserFromView,
    @Body() createBatchDto: CreateBatchStudentEnrollmentDto,
  ): Promise<ApiResponse<any>> {
    return await this.enrollmentsService.createBatchEnrollments(
      user.id,
      createBatchDto,
    );
  }

  /* ============================================================
  📋 FIND ALL ENROLLMENTS (SICES V3)
  ------------------------------------------------------------
  📌 Endpoint protegido para obtener listado de inscripciones.
  - Usa paginación segura
  - Consulta desde la vista ViewEnrollment
  - No requiere mapper (datos ya limpios desde DB)
  - El interceptor transforma BigInt y fechas
  ============================================================ */
  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.enrollmentsService.findAll(paginationDto);
  }

  /* ============================================================
  📋 FIND MANY ENROLLMENTS (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Endpoint para listar inscripciones con filtros dinámicos,
  paginación segura y control de acceso por módulo.
  ============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryEnrollmentDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.enrollmentsService.findMany(filters);
  }

  /* ============================================================
  🔍 FIND ONE BY (SICES V3 - UNIQUE)
  ------------------------------------------------------------
  📌 Descripción:
  Busca una inscripción por campos @unique de la vista.
  ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findOneBy(
    @Param('search') search: string,
    @Query('light') light?: string,
  ) {
    const searchDto = plainToClass(SearchDto, { search });
    try {
      await validateOrReject(searchDto);
    } catch {
      throw new BadRequestException(
        'El término de búsqueda no tiene un formato válido.',
      );
    }
    return await this.enrollmentsService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: false,
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @GetUser() user: UserFromView,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<ApiResponse<any>> {
    return await this.enrollmentsService.update({
      id: +id,
      dto: updateEnrollmentDto,
      userId: user.id,
      options: { returnData: true },
    });
  }

  /* ============================================================
   📋 REASSIGN LIST NUMBERS (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint para reasignar números de lista de una clase.
   ============================================================ */
  @Patch('/list-numbers/:classCode')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.ENROLLMENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async reassignListNumbers(
    @Param('classCode', ClassCodeValidationPipe) classCode: string,
  ): Promise<ApiResponse<void>> {
    return await this.enrollmentsService.reassignListNumbers(classCode);
  }
}
