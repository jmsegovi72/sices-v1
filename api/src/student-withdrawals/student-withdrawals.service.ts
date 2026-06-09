import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractFindParams,
  httpRequestFindMany,
  httpRequestFindUnique,
  qwikMessageResponse,
  resolvePagination,
} from '@/common/helpers';
import { ApiResponse, FindEntityParams } from '@/common/interfaces';
import { TypeWhereFieldMap } from '@/common/types';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStudentWithdrawalDto } from './dto/create-student-withdrawal.dto';
import { QueryStudentWithdrawalDto } from './dto/query-student-withdrawal.dto';
import { UpdateStudentWithdrawalDto } from './dto/update-student-withdrawal.dto';

@Injectable()
export class StudentWithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
  ❌ CREATE STUDENT WITHDRAWAL (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Realiza el registro de una baja de un alumno de forma atómica.
  - Actualiza el estado del alumno en la tabla 'students'.
  - Inserta el registro en 'student_withdrawals' para cada inscripción activa.
  - Finaliza todas sus calificaciones 'TEMPORAL' a 'FINAL'.
  ============================================================ */
  async create(
    dto: CreateStudentWithdrawalDto,
    userId: number,
  ): Promise<ApiResponse<void>> {
    const { studentId, studentStatusId, withdrawalReasonId, withdrawalDate } =
      dto;

    this.logger.info(
      { studentId, studentStatusId, withdrawalReasonId, createdBy: userId },
      'Iniciando registro de baja de alumno',
    );

    // 1. Validar si el alumno existe
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El alumno con ID ${studentId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 2. Validar que el estatus de baja exista
    const targetStatus = await this.prisma.studentStatus.findUnique({
      where: { id: studentStatusId },
    });

    if (!targetStatus) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: `El estatus de baja con ID ${studentStatusId} no existe en el catálogo.`,
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 3. Validar que el motivo de baja exista
    const targetReason = await this.prisma.withdrawalReason.findUnique({
      where: { id: withdrawalReasonId },
    });

    if (!targetReason) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: `El motivo de baja con ID ${withdrawalReasonId} no existe en el catálogo.`,
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 4. Buscar inscripciones activas (que tengan calificaciones en estado 'TEMPORAL')
    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        grades: {
          some: {
            temporality: 'TEMPORAL',
          },
        },
      },
      select: {
        id: true,
      },
    });

    const activeEnrollmentIds = activeEnrollments.map((e) => e.id);

    // 5. Ejecutar la transacción atómica
    await this.prisma.$transaction(async (tx) => {
      // a. Actualizar el estado del alumno en 'students' y auditar con updatedBy
      await tx.student.update({
        where: { id: studentId },
        data: {
          statusId: studentStatusId,
          updatedBy: userId,
        },
      });

      if (activeEnrollmentIds.length > 0) {
        // b. Crear un registro de baja para cada inscripción activa en la tabla 'student_withdrawals'
        const wDate = withdrawalDate ? new Date(withdrawalDate) : new Date();

        for (const enrollmentId of activeEnrollmentIds) {
          await tx.studentWithdrawal.upsert({
            where: { enrollmentId },
            update: {
              studentStatusId,
              withdrawalReasonId,
              withdrawalDate: wDate,
              updatedBy: userId,
            },
            create: {
              enrollmentId,
              studentStatusId,
              withdrawalReasonId,
              withdrawalDate: wDate,
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }

        // c. Actualizar calificaciones de tipo 'TEMPORAL' a 'FINAL' y auditar
        await tx.grade.updateMany({
          where: {
            enrollmentId: { in: activeEnrollmentIds },
            temporality: 'TEMPORAL',
          },
          data: {
            temporality: 'FINAL',
            updatedBy: userId,
          },
        });
      }
    });

    return qwikMessageResponse<void>({
      success: true,
      message:
        'Se ha registrado la baja del alumno correctamente y finalizado sus calificaciones pendientes.',
    });
  }

  /* ============================================================
  📋 FIND MANY STUDENT WITHDRAWALS (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Obtiene un listado de bajas con filtros dinámicos y paginación.
  - studentCode y studentCurp se buscan de forma exacta.
  ============================================================ */
  async findMany<T>(
    filters: QueryStudentWithdrawalDto,
  ): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewStudentWithdrawalWhereInput,
      QueryStudentWithdrawalDto
    >(filters, {
      searchTermMode: true,
      contains: {
        studentFullName: 'studentFullName',
        educationalProgram: 'educationalProgram',
        educationLevel: 'educationLevel',
        academicDiscipline: 'academicDiscipline',
      },
      equals: {
        studentCode: 'studentCode',
        studentCurp: 'studentCurp',
        semiannualPeriod: 'semiannualPeriod',
        semester: 'semester',
        studentStatusKey: 'studentStatusKey',
        reasonForDropout: 'reasonForDropout',
        classCode: 'classCode',
      },
      orSearch: [
        'studentCode',
        'studentCurp',
        'studentFullName',
        'educationalProgram',
      ],
    });

    const queryOptions: Prisma.ViewStudentWithdrawalFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: StudentWithdrawalsService.name,
      model: this.prisma.viewStudentWithdrawal,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
  📋 FIND ALL STUDENT WITHDRAWALS (SICES V3)
  ------------------------------------------------------------
  ============================================================ */
  findAll() {
    return `This action returns all studentWithdrawals`;
  }

  /* ============================================================
  🔍 FIND ONE STUDENT WITHDRAWAL (SICES V3)
  ------------------------------------------------------------
  ============================================================ */
  async findOneBy<T>(
    params: FindEntityParams<SearchDto>,
  ): Promise<ApiResponse<T | null>> {
    // 🔹 1. Extracción estándar
    const { searchDto, client, throwIfNotFound } = extractFindParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validación del DTO de búsqueda
    if (!searchDto.search) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'Se requiere un término de búsqueda válido.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    const { type, value } = searchDto.search;
    const fieldMaps: TypeWhereFieldMap[] = [{ type: 'id', field: 'id' }];
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.studentWithdrawal : client.viewStudentWithdrawal;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        withdrawalDate: true,
        enrollmentId: true,
        studentStatusId: true,
        withdrawalReasonId: true,
        student_status: {
          select: {
            statusKey: true,
            statusName: true,
          },
        },
        withdrawal_reasons: {
          select: {
            reason: true,
          },
        },
        enrollments: {
          select: {
            classes: {
              select: {
                classCode: true,
                semesterId: true,
                semiannual_periods: {
                  select: {
                    semiannualPeriod: true,
                  },
                },
              },
            },
            students: {
              select: {
                codeNumber: true,
                persons: {
                  select: {
                    curp: true,
                    firstName: true,
                    firstLastName: true,
                    secondLastName: true,
                  },
                },
                educational_programs: {
                  select: {
                    name: true,
                    academic_disciplines: {
                      select: {
                        name: true,
                        school_offered_levels: {
                          select: {
                            offeredEducationLevel: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    }

    const result = await httpRequestFindUnique<any>({
      serviceName: StudentWithdrawalsService.name,
      model,
      logger: this.logger,
      queryOptions,
      searchDto,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const withdrawal = result.data;
      const enrollment = withdrawal.enrollments;
      const student = enrollment?.students;
      const person = student?.persons;
      const studentFullName = person
        ? [person.firstName, person.firstLastName, person.secondLastName]
            .filter(Boolean)
            .join(' ')
        : null;

      const ep = student?.educational_programs;
      const discipline = ep?.academic_disciplines;

      result.data = {
        id: withdrawal.id,
        dropoutDate: withdrawal.withdrawalDate,
        studentStatusKey: withdrawal.student_status?.statusKey ?? null,
        studentStatus: withdrawal.student_status?.statusName ?? null,
        studentCode: student?.codeNumber ?? null,
        studentFullName,
        studentCurp: person?.curp ?? null,
        classCode: enrollment?.classes?.classCode ?? null,
        semiannualPeriod: enrollment?.classes?.semiannual_periods?.semiannualPeriod ?? null,
        semester: enrollment?.classes?.semesterId ?? null,
        educationLevel: discipline?.school_offered_levels?.offeredEducationLevel ?? null,
        educationalProgram: ep?.name ?? null,
        academicDiscipline: discipline?.name ?? null,
        reasonForDropout: withdrawal.withdrawal_reasons?.reason ?? null,
        enrollmentId: withdrawal.enrollmentId,
        studentStatusId: withdrawal.studentStatusId,
        withdrawalReasonId: withdrawal.withdrawalReasonId,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
  ✏️ UPDATE STUDENT WITHDRAWAL (SICES V3)
  ------------------------------------------------------------
  ============================================================ */
  update(id: number, updateStudentWithdrawalDto: UpdateStudentWithdrawalDto) {
    return `This action updates a #${id} studentWithdrawal`;
  }

  /* ============================================================
  🗑️ REMOVE STUDENT WITHDRAWAL (SICES V3)
  ------------------------------------------------------------
  ============================================================ */
  remove(id: number) {
    return `This action removes a #${id} studentWithdrawal`;
  }
}
