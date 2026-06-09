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
  CreateManyStudentDto,
  CreateStudentDto,
  QueryStudentDto,
  UpdateBatchStudentCodesDto,
  UpdateBatchStudentMailsDto,
  UpdateStudentDto,
} from './dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /* ============================================================
     🎓 CREATE STUDENT (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que da de alta a una persona como alumno.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<ApiResponse<any>> {
    return await this.studentsService.create({
      userId: user.id,
      dto: createStudentDto,
      options: {
        returnData: false,
      },
    });
  }

  @Post('/bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyStudentDto: CreateManyStudentDto,
  ): Promise<ApiResponse<void>> {
    return await this.studentsService.createMany({
      userId: user.id,
      dto: createManyStudentDto,
      options: {
        returnData: false,
      },
    });
  }

  @Get('/list')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.studentsService.findAll(paginationDto);
  }

  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryStudentDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.studentsService.findMany(filters);
  }

  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
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
    return await this.studentsService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<ApiResponse<any>> {
    return await this.studentsService.update({
      userId: user.id,
      id,
      dto: updateStudentDto,
      options: {
        returnData: false,
      },
    });
  }
  /* ============================================================
   📧 UPDATE BATCH STUDENT EMAILS (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido para actualización masiva de correos
   institucionales.
   ============================================================ */
  @Patch('/batch/emails')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async updateBatchEmails(
    @GetUser() user: UserFromView,
    @Body() dto: UpdateBatchStudentMailsDto,
  ): Promise<ApiResponse<void>> {
    return await this.studentsService.updateBatchStudentEmails(user.id, dto);
  }

  /* ============================================================
   🎓 UPDATE BATCH STUDENT CODES (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido para actualización masiva de matrículas.
   ============================================================ */
  @Patch('/batch/codes')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async updateBatchCodes(
    @GetUser() user: UserFromView,
    @Body() dto: UpdateBatchStudentCodesDto,
  ): Promise<ApiResponse<void>> {
    return await this.studentsService.updateBatchStudentCodes(user.id, dto);
  }
}
