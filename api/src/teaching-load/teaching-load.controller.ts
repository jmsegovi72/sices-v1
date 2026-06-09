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
  BulkCreateTeachingLoadDto,
  CreateTeachingLoadDto,
  QueryTeachingLoadDto,
  UpdateTeachingLoadDto,
} from './dto';
import { TeachingLoadService } from './teaching-load.service';

@Controller('teaching-load')
export class TeachingLoadController {
  constructor(private readonly teachingLoadService: TeachingLoadService) {}

  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createTeachingLoadDto: CreateTeachingLoadDto,
  ): Promise<ApiResponse<any>> {
    return await this.teachingLoadService.create({
      userId: user.id,
      dto: createTeachingLoadDto,
      options: { returnData: false },
    });
  }

  @Post('bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createBulk(
    @GetUser() user: UserFromView,
    @Body() bulkCreateDto: BulkCreateTeachingLoadDto,
  ): Promise<ApiResponse<any>> {
    return await this.teachingLoadService.bulkCreate({
      userId: user.id,
      dto: bulkCreateDto,
      options: { returnData: false },
    });
  }

  /* ============================================================
     📋 FIND ALL TEACHING LOADS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que obtiene la lista paginada de la carga académica.
     ============================================================ */
  @Get('list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.teachingLoadService.findAll(paginationDto);
  }

  /* ============================================================
     📋 FIND MANY TEACHING LOADS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido para consultar carga académica con filtros dinámicos.
     ============================================================ */
  @Get('query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryTeachingLoadDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.teachingLoadService.findMany(filters);
  }

  /* ============================================================
     🔍 FIND ONE TEACHING LOAD BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que busca una carga académica por ID en la vista.
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
    return await this.teachingLoadService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE TEACHING LOAD (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido para actualizar los datos de una carga académica.
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.TEACHING_LOAD, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id') id: string,
    @Body() updateTeachingLoadDto: UpdateTeachingLoadDto,
  ): Promise<ApiResponse<any>> {
    return await this.teachingLoadService.update({
      userId: user.id,
      id: +id,
      dto: updateTeachingLoadDto,
      options: { returnData: false },
    });
  }
}
