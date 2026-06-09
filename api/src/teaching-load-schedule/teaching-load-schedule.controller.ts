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
import type { UserFromView } from '@/common/types';
import {
  BulkCreateTeachingLoadScheduleDto,
  CreateTeachingLoadScheduleDto,
  QueryTeachingLoadScheduleDto,
  UpdateTeachingLoadScheduleDto,
} from './dto';
import { TeachingLoadScheduleService } from './teaching-load-schedule.service';

@Controller('teaching-load-schedule')
export class TeachingLoadScheduleController {
  constructor(private readonly scheduleService: TeachingLoadScheduleService) {}

  /* ============================================================
     📋 CREATE TEACHING LOAD SCHEDULE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra un horario para carga académica.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createDto: CreateTeachingLoadScheduleDto,
  ): Promise<ApiResponse<any>> {
    return await this.scheduleService.create({
      userId: user.id,
      dto: createDto,
      options: { returnData: false },
    });
  }

  /* ============================================================
     📋 BULK CREATE TEACHING LOAD SCHEDULES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra horarios para carga académica en lote.
     ============================================================ */
  @Post('bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(
    @GetUser() user: UserFromView,
    @Body() bulkCreateDto: BulkCreateTeachingLoadScheduleDto,
  ): Promise<ApiResponse<any>> {
    return await this.scheduleService.bulkCreate({
      userId: user.id,
      dto: bulkCreateDto,
      options: { returnData: true },
    });
  }

  /* ============================================================
     📋 FIND ALL TEACHING LOAD SCHEDULES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que obtiene la lista paginada de horarios.
     ============================================================ */
  @Get('list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.scheduleService.findAll(paginationDto);
  }

  /* ============================================================
     📋 FIND MANY TEACHING LOAD SCHEDULES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint para consultar horarios con filtros dinámicos.
     ============================================================ */
  @Get('query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryTeachingLoadScheduleDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.scheduleService.findMany(filters);
  }

  /* ============================================================
     🔍 FIND ONE TEACHING LOAD SCHEDULE BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que busca un horario por ID en la vista.
     ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'read')
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
    return await this.scheduleService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE TEACHING LOAD SCHEDULE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido para actualizar los datos de un horario.
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id') id: string,
    @Body() updateDto: UpdateTeachingLoadScheduleDto,
  ): Promise<ApiResponse<any>> {
    return await this.scheduleService.update({
      userId: user.id,
      id: +id,
      dto: updateDto,
      options: { returnData: false },
    });
  }
}
