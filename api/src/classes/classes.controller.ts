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
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import type { UserFromView } from '@/common/types';
import { ClassesService } from './classes.service';
import { CreateClassDto, QueryClassDto, UpdateClassDto } from './dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  /* ============================================================
   🏫 CREATE CLASS (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido que registra una clase.
   - Genera classCode automáticamente si no se proporciona
   ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.CLASSES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createClassDto: CreateClassDto,
  ): Promise<ApiResponse<any>> {
    return await this.classesService.create({
      userId: user.id,
      dto: createClassDto,
      options: { returnData: false },
    });
  }

  /* ============================================================
     📋 QUERY CLASSES (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint para listar clases con filtros dinámicos,
     paginación segura y control de acceso por módulo.
     ============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.CLASSES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(@Query() filters: QueryClassDto): Promise<ApiResponse<any[]>> {
    return await this.classesService.findMany(filters);
  }

  /* ============================================================
     🔍 FIND ONE CLASS BY CRITERIA (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint para buscar una clase (de la vista ViewClass)
     usando un término flexible (ID o classCode).
     ============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.CLASSES, 'read')
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
    return await this.classesService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE CLASS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que actualiza una clase.
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.CLASSES, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateClassDto: UpdateClassDto,
  ): Promise<ApiResponse<any>> {
    return await this.classesService.update({
      userId: user.id,
      id,
      dto: updateClassDto,
      options: { returnData: false },
    });
  }
}
