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
import {
  ChangeStaffStatusDto,
  CreateStaffDto,
  CreateStaffTeachingProfileDto,
  QueryStaffDto,
  QueryStaffTeachingProfileDto,
  UpdateStaffAcademicProfileDto,
  UpdateStaffDto,
  UpdateStaffTeachingProfileDto,
} from './dto';
import { StaffService } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /* ============================================================
     👔 CREATE STAFF (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que da de alta a un miembro del personal
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createStaffDto: CreateStaffDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.create({
      userId: user.id,
      dto: createStaffDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     📋 FIND MANY STAFF (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que obtiene el listado de personal
     con soporte para filtros de catálogos principales y búsqueda.
     ============================================================ */
  @Get('query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(@Query() filters: QueryStaffDto): Promise<ApiResponse<any[]>> {
    return await this.staffService.findMany(filters);
  }

  /* ============================================================
     📋 FIND ALL STAFF (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que obtiene la lista paginada de personal
     ============================================================ */
  @Get('list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.staffService.findAll(paginationDto);
  }

  /* ============================================================
     👔 CREATE STAFF TEACHING PROFILE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra un perfil docente.
     ============================================================ */
  @Post('teaching-profile')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createTeachingProfile(
    @GetUser() user: UserFromView,
    @Body() createTeachingProfileDto: CreateStaffTeachingProfileDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.createTeachingProfile({
      userId: user.id,
      dto: createTeachingProfileDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     📋 FIND ALL STAFF TEACHING PROFILES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que obtiene la lista paginada de perfiles docentes.
     ============================================================ */
  @Get('teaching-profile/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findAllTeachingProfiles(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.staffService.findAllTeachingProfiles(paginationDto);
  }

  /* ============================================================
     📋 QUERY STAFF TEACHING PROFILES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que busca perfiles docentes con filtros.
     ============================================================ */
  @Get('teaching-profile/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findManyTeachingProfiles(
    @Query() filters: QueryStaffTeachingProfileDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.staffService.findManyTeachingProfiles(filters);
  }

  /* ============================================================
     🔍 FIND ONE STAFF TEACHING PROFILE BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que busca un perfil docente específico.
     ============================================================ */
  @Get('teaching-profile/:search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
  @HttpCode(HttpStatus.OK)
  async findOneTeachingProfileBy(@Param('search') search: string) {
    const searchDto = plainToClass(SearchDto, { search });
    try {
      await validateOrReject(searchDto);
    } catch {
      throw new BadRequestException(
        'El término de búsqueda no tiene un formato válido.',
      );
    }
    return await this.staffService.findOneTeachingProfileBy({ searchDto });
  }

  /* ============================================================
     ✏️ UPDATE STAFF TEACHING PROFILE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que actualiza el perfil docente por ID de Staff.
     ============================================================ */
  @Patch('teaching-profile/:id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'update')
  @HttpCode(HttpStatus.OK)
  async updateTeachingProfile(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateTeachingProfileDto: UpdateStaffTeachingProfileDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.updateTeachingProfile({
      userId: user.id,
      id,
      dto: updateTeachingProfileDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     👔 FIND ONE STAFF BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que busca un personal en la vista
     view_staff_complete por ID (único criterio permitido).
     ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'read')
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
    return await this.staffService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE STAFF (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que actualiza los datos del contrato general
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateStaffDto: UpdateStaffDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.update({
      userId: user.id,
      id,
      dto: updateStaffDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE STAFF ACADEMIC PROFILE (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que actualiza el perfil académico
     ============================================================ */
  @Patch('academic-profile/:id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'update')
  @HttpCode(HttpStatus.OK)
  async updateAcademicProfile(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateStaffAcademicProfileDto: UpdateStaffAcademicProfileDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.updateAcademicProfile({
      userId: user.id,
      id,
      dto: updateStaffAcademicProfileDto,
      options: {
        returnData: false,
      },
    });
  }

  /* ============================================================
     🔄 PATCH: staff/status/:id
     ------------------------------------------------------------
     📌 Descripción:
     Ruta administrativa para cambiar el estatus de un miembro del personal.
     ============================================================ */
  @Patch('status/:id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'update')
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @GetUser() user: UserFromView,
    @Body() changeStaffStatusDto: ChangeStaffStatusDto,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.changeStatus(
      id,
      user.id,
      changeStaffStatusDto,
    );
  }

  /* ============================================================
     🔄 PATCH: staff/toggle-classroom-teacher/:id
     ------------------------------------------------------------
     📌 Descripción:
     Ruta administrativa para activar o desactivar la bandera
     isClassroomTeacher (frente a grupo) de un miembro del personal.
     ============================================================ */
  @Patch('toggle-classroom-teacher/:id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STAFF, 'update')
  @HttpCode(HttpStatus.OK)
  async toggleClassroomTeacher(
    @Param('id', ParsePositiveIntPipe) id: number,
    @GetUser() user: UserFromView,
  ): Promise<ApiResponse<any>> {
    return await this.staffService.toggleIsClassroomTeacher(id, user.id);
  }
}
