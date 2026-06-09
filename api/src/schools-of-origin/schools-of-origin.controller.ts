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
import { PaginationDto, SearchDto } from '@/common/dtos';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import type { UserFromView } from '@/common/types';
import {
  CreateSchoolOfOriginDto,
  QuerySchoolOfOriginDto,
  UpdateSchoolsOfOriginDto,
} from './dto';
import { SchoolsOfOriginService } from './schools-of-origin.service';

@Controller('schools-of-origin')
export class SchoolsOfOriginController {
  constructor(
    private readonly schoolsOfOriginService: SchoolsOfOriginService,
  ) {}

  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.SCHOOLS_OF_ORIGIN, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createSchoolOfOriginDto: CreateSchoolOfOriginDto,
  ): Promise<ApiResponse<any>> {
    return await this.schoolsOfOriginService.create({
      userId: user.id,
      dto: createSchoolOfOriginDto,
      options: { returnData: false },
    });
  }

  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.SCHOOLS_OF_ORIGIN, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.schoolsOfOriginService.findAll(paginationDto);
  }

  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.SCHOOLS_OF_ORIGIN, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QuerySchoolOfOriginDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.schoolsOfOriginService.findMany(filters);
  }

  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.SCHOOLS_OF_ORIGIN, 'read')
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
    return await this.schoolsOfOriginService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.SCHOOLS_OF_ORIGIN, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateSchoolOfOriginDto: UpdateSchoolsOfOriginDto,
  ): Promise<ApiResponse<any>> {
    return await this.schoolsOfOriginService.update({
      userId: user.id,
      id,
      dto: updateSchoolOfOriginDto,
      options: { returnData: false },
    });
  }
}
