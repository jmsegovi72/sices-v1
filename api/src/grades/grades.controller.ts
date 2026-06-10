import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { SearchDto } from '@/common/dtos';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import {
  CreateGradeDto,
  CreateManyGradesDto,
  QueryGradeDto,
  UpdateGradeDto,
} from './dto';
import { GradesService } from './grades.service';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.GRADES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createGradeDto: CreateGradeDto,
  ): Promise<ApiResponse<any>> {
    return await this.gradesService.create({
      userId: user.id,
      dto: createGradeDto,
      options: { returnData: false },
    });
  }

  @Post('/bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.GRADES, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyGradesDto: CreateManyGradesDto,
  ): Promise<ApiResponse<void>> {
    return await this.gradesService.createMany({
      userId: user.id,
      dto: createManyGradesDto,
      options: { returnData: false },
    });
  }

  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.GRADES, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryGradeDto,
    @GetUser() user: UserFromView,
  ): Promise<ApiResponse<any[]>> {
    return await this.gradesService.findMany(filters, user);
  }

  @Get()
  findAll() {
    return this.gradesService.findAll();
  }

  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.GRADES, 'read')
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
    return await this.gradesService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.GRADES, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateGradeDto: UpdateGradeDto,
  ): Promise<ApiResponse<any>> {
    return await this.gradesService.update({
      userId: user.id,
      id,
      dto: updateGradeDto,
      options: { returnData: false },
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gradesService.remove(+id);
  }
}
