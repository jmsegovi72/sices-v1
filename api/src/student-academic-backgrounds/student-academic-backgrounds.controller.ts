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
  CreateStudentAcademicBackgroundDto,
  QueryStudentAcademicBackgroundDto,
  UpdateStudentAcademicBackgroundDto,
} from './dto';
import { StudentAcademicBackgroundsService } from './student-academic-backgrounds.service';

@Controller('student-academic-backgrounds')
export class StudentAcademicBackgroundsController {
  constructor(
    private readonly studentAcademicBackgroundsService: StudentAcademicBackgroundsService,
  ) {}

  /* ============================================================
     🎓 CREATE STUDENT ACADEMIC BACKGROUND (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra el historial académico previo.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENT_ACADEMIC_BACKGROUNDS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body()
    createStudentAcademicBackgroundDto: CreateStudentAcademicBackgroundDto,
  ): Promise<ApiResponse<any>> {
    return await this.studentAcademicBackgroundsService.create({
      userId: user.id,
      dto: createStudentAcademicBackgroundDto,
      options: { returnData: false },
    });
  }

  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENT_ACADEMIC_BACKGROUNDS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.studentAcademicBackgroundsService.findAll(paginationDto);
  }

  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENT_ACADEMIC_BACKGROUNDS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryStudentAcademicBackgroundDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.studentAcademicBackgroundsService.findMany(filters);
  }

  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENT_ACADEMIC_BACKGROUNDS, 'read')
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
    return await this.studentAcademicBackgroundsService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: false,
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENT_ACADEMIC_BACKGROUNDS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body()
    updateStudentAcademicBackgroundDto: UpdateStudentAcademicBackgroundDto,
  ): Promise<ApiResponse<any>> {
    return await this.studentAcademicBackgroundsService.update({
      userId: user.id,
      id,
      dto: updateStudentAcademicBackgroundDto,
      options: { returnData: false },
    });
  }
}
