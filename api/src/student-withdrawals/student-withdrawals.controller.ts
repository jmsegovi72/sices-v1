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
import type { UserFromView } from '@/common/types';
import { CreateStudentWithdrawalDto } from './dto/create-student-withdrawal.dto';
import { QueryStudentWithdrawalDto } from './dto/query-student-withdrawal.dto';
import { UpdateStudentWithdrawalDto } from './dto/update-student-withdrawal.dto';
import { StudentWithdrawalsService } from './student-withdrawals.service';

@Controller('student-withdrawals')
export class StudentWithdrawalsController {
  constructor(
    private readonly studentWithdrawalsService: StudentWithdrawalsService,
  ) {}

  /* ============================================================
     ❌ CREATE STUDENT WITHDRAWAL (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra la baja de un alumno,
     actualiza su estatus e invalida sus materias activas (TEMPORAL -> FINAL).
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createStudentWithdrawalDto: CreateStudentWithdrawalDto,
  ): Promise<ApiResponse<void>> {
    return await this.studentWithdrawalsService.create(
      createStudentWithdrawalDto,
      user.id,
    );
  }

  /* ============================================================
     📋 FIND MANY STUDENT WITHDRAWALS (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que consulta bajas con filtros avanzados.
     ============================================================ */
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryStudentWithdrawalDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.studentWithdrawalsService.findMany(filters);
  }

  /* ============================================================
     📋 FIND ALL STUDENT WITHDRAWALS (SICES V3)
     ------------------------------------------------------------
     ============================================================ */
  @Get()
  findAll() {
    return this.studentWithdrawalsService.findAll();
  }

  /* ============================================================
     🔍 FIND ONE STUDENT WITHDRAWAL (SICES V3)
     ------------------------------------------------------------
     ============================================================ */
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
    return await this.studentWithdrawalsService.findOneBy({
      searchDto,
      options: {
        throwIfNotFound: true,
        light: light === 'true' || light === '1',
      },
    });
  }

  /* ============================================================
     ✏️ UPDATE STUDENT WITHDRAWAL (SICES V3)
     ------------------------------------------------------------
     ============================================================ */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStudentWithdrawalDto: UpdateStudentWithdrawalDto,
  ) {
    return this.studentWithdrawalsService.update(
      +id,
      updateStudentWithdrawalDto,
    );
  }

  /* ============================================================
     🗑️ REMOVE STUDENT WITHDRAWAL (SICES V3)
     ------------------------------------------------------------
     ============================================================ */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentWithdrawalsService.remove(+id);
  }
}
