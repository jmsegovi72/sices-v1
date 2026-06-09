import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino/PinoLogger';

import { SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractCreateParams,
  extractFindParams,
  extractUpdateParams,
  httpRequestCreate,
  httpRequestFindMany,
  httpRequestFindUnique,
  httpRequestUpdate,
  qwikMessageResponse,
  resolvePagination,
} from '@/common/helpers';
import {
  ApiResponse,
  CreateEntityParams,
  FindEntityParams,
  UpdateEntityParams,
} from '@/common/interfaces';
import { TypeWhereFieldMap } from '@/common/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateGradeDto,
  CreateManyGradesDto,
  QueryGradeDto,
  UpdateGradeDto,
} from './dto';

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
  📝 CREATE GRADE (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Registra la calificación de un alumno para una materia.
  - Calcula type y temporality automáticamente
  Pre-checks:
  1. Enrollment existe (409)
  2. Subject pertenece al programa/semestre del enrollment (409)
  3. Ya existe calificación con mismo enrollment+subject+opportunity (409)
  4. Si opportunity>=1 → ¿existe oportunidad previa? (409)
  5. Si opportunity>=1 → calificación previa tiene temporality=TEMPORAL (409)
  6. Si opportunity=1 → canTakeExtraordinary=true (409)
  7. Si opportunity=2 → canTakeSecondOpportunity=true (409)
  ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateGradeDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    const opportunity =
      data.opportunity ??
      (await client.grade.count({
        where: {
          enrollmentId: data.enrollmentId,
          subjectId: data.subjectId,
        },
      }));

    this.logger.info(
      {
        enrollmentId: data.enrollmentId,
        subjectId: data.subjectId,
        opportunity,
        createdBy: userId,
      },
      'Iniciando registro de calificación',
    );

    // 🔹 PRE-CHECK 1: Enrollment existe
    const enrollment = await client.enrollment.findUnique({
      where: { id: data.enrollmentId },
      select: {
        id: true,
        classes: { select: { educationalProgramId: true, semesterId: true } },
      },
    });

    if (!enrollment) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Calificación denegada: La inscripción con ID ${data.enrollmentId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 2: Subject pertenece al programa/semestre del enrollment
    const validSubject = await client.studyPlan.findFirst({
      where: {
        id: data.subjectId,
        educationalProgramId: enrollment.classes.educationalProgramId,
        semesterId: enrollment.classes.semesterId,
      },
      select: { id: true },
    });

    if (!validSubject) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Calificación denegada: La materia con ID ${data.subjectId} no pertenece al programa/semestre de la inscripción.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 3: Ya existe calificación con mismo enrollment+subject+opportunity
    const existingGrade = await client.grade.findFirst({
      where: {
        enrollmentId: data.enrollmentId,
        subjectId: data.subjectId,
        opportunity,
      },
      select: { id: true },
    });

    if (existingGrade) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Calificación denegada: Ya existe una calificación para esta materia en la oportunidad ${opportunity}.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECKS 4 y 5: Oportunidad previa existe y es TEMPORAL
    if (opportunity >= 1) {
      const previousGrade = await client.grade.findFirst({
        where: {
          enrollmentId: data.enrollmentId,
          subjectId: data.subjectId,
          opportunity: opportunity - 1,
        },
        select: { id: true, temporality: true },
      });

      if (!previousGrade) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Calificación denegada: No existe calificación previa para la oportunidad ${opportunity - 1}.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (previousGrade.temporality === 'FINAL') {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Calificación denegada: La calificación anterior ya está acreditada (FINAL).',
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // 🔹 PRE-CHECK 6: Si opportunity=1 → canTakeExtraordinary=true
    if (opportunity === 1) {
      const regularization = await client.viewFailedSubject.findFirst({
        where: { enrollmentId: data.enrollmentId },
        select: { canTakeExtraordinary: true },
      });

      if (!regularization?.canTakeExtraordinary) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Calificación denegada: El alumno no tiene derecho a presentar extraordinario.',
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // 🔹 PRE-CHECK 7: Si opportunity=2 → canTakeSecondOpportunity=true
    if (opportunity === 2) {
      const regularization = await client.viewFailedSubject.findFirst({
        where: { enrollmentId: data.enrollmentId },
        select: { canTakeSecondOpportunity: true },
      });

      if (!regularization?.canTakeSecondOpportunity) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Calificación denegada: El alumno no tiene derecho a segunda oportunidad.',
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // 🔹 Calcular type y temporality automáticamente
    const type =
      data.type ?? (opportunity === 0 && data.grade >= 6 ? 'CS' : 'RE');
    const temporality =
      data.temporality ??
      (data.grade >= 6 || opportunity === 2 ? 'FINAL' : 'TEMPORAL');

    const gradeData = {
      enrollmentId: data.enrollmentId,
      subjectId: data.subjectId,
      grade: data.grade,
      type,
      temporality,
      opportunity,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      {
        enrollmentId: data.enrollmentId,
        subjectId: data.subjectId,
        type,
        temporality,
        opportunity,
      },
      'Datos para registro de calificación',
    );

    return await httpRequestCreate<typeof gradeData, T>({
      serviceName: GradesService.name,
      methodName: 'create',
      model: client.grade,
      logger: this.logger,
      data: gradeData,
      returnData,
    });
  }

  /* ============================================================
  📝 CREATE MANY GRADES (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Registra calificaciones de un lote de alumnos para una materia.
  - Calcula opportunity, type y temporality automáticamente
  - Si un registro falla, se cancela todo el lote
  ============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyGradesDto>,
  ): Promise<ApiResponse<void>> {
    const { userId, data } = extractCreateParams(params, this.prisma);

    this.logger.info(
      { total: data.grades.length, createdBy: userId },
      'Iniciando registro masivo de calificaciones',
    );

    return await this.prisma.$transaction(async (tx) => {
      for (const item of data.grades) {
        await this.create({
          userId,
          dto: {
            ...item,
          },
          options: { tx, returnData: false },
        });
      }

      return qwikMessageResponse<void>({
        success: true,
        message: `Se registraron ${data.grades.length} calificaciones correctamente.`,
      });
    });
  }

  /* ============================================================
  📋 FIND MANY GRADES (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Listado de calificaciones con filtros dinámicos.
  - Por clase → todas las calificaciones del grupo
  - Por alumno → boleta del alumno
  - Por oportunidad, temporality, type
  ============================================================ */
  async findMany<T>(filters: QueryGradeDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewGradeWhereInput,
      QueryGradeDto
    >(filters, {
      contains: {
        fullName: 'fullName',
        subjectName: 'subjectName',
      },
      equals: {
        curp: 'curp',
        classCode: 'classCode',
        codeNumber: 'studentCode',
        type: 'type',
        temporality: 'temporality',
        opportunity: 'opportunity',
        schoolYear: 'schoolYear',
        semiannualPeriod: 'semiannualPeriod',
      },
      orSearch: ['fullName', 'curp', 'studentCode', 'classCode'],
    });

    const queryOptions: Prisma.ViewGradeFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [
        { classCode: 'asc' },
        { listNumber: 'asc' },
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
        { subjectName: 'asc' },
        { opportunity: 'asc' },
      ],
    };

    return await httpRequestFindMany<T>({
      serviceName: GradesService.name,
      model: this.prisma.viewGrade,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  findAll() {
    return `This action returns all grades`;
  }

  async findOneBy<T>(
    params: FindEntityParams<SearchDto>,
  ): Promise<ApiResponse<T | null>> {
    // 🔹 1. Extracción estándar
    const { searchDto, client, throwIfNotFound } = extractFindParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validación
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

    // 🔹 3. Mapeo dinámico
    const fieldMaps: TypeWhereFieldMap[] = [{ type: 'id', field: 'id' }];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.grade : client.viewGrade;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        enrollmentId: true,
        subjectId: true,
        grade: true,
        type: true,
        temporality: true,
        opportunity: true,
        study_plans: {
          select: {
            subjectName: true,
            subjectKey: true,
          },
        },
        enrollments: {
          select: {
            classId: true,
            classes: {
              select: {
                classCode: true,
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
                    gender: true,
                  },
                },
              },
            },
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const result = await httpRequestFindUnique<any>({
      serviceName: GradesService.name,
      model,
      logger: this.logger,
      queryOptions,
      searchDto,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const gradeRecord = result.data;
      const enrollment = gradeRecord.enrollments;
      const student = enrollment?.students;
      const person = student?.persons;
      const fullName = person
        ? [person.firstName, person.firstLastName, person.secondLastName]
            .filter(Boolean)
            .join(' ')
        : null;

      result.data = {
        id: gradeRecord.id,
        grade: gradeRecord.grade,
        type: gradeRecord.type,
        temporality: gradeRecord.temporality,
        opportunity: gradeRecord.opportunity,
        curp: person?.curp ?? null,
        fullName,
        gender: person?.gender ?? null,
        studentCode: student?.codeNumber ?? null,
        classCode: enrollment?.classes?.classCode ?? null,
        subjectName: gradeRecord.study_plans?.subjectName ?? null,
        enrollmentId: gradeRecord.enrollmentId,
        subjectId: gradeRecord.subjectId,
        classId: enrollment?.classId ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  async update<R = any>(
    params: UpdateEntityParams<UpdateGradeDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    const { enrollmentId, subjectId, updatedBy, ...dtoToSave } =
      data as unknown as Record<string, any>;

    // Buscamos la calificación existente para conocer su oportunidad actual
    const existingGrade = await client.grade.findUnique({
      where: { id: Number(idValue) },
      select: { opportunity: true },
    });

    if (!existingGrade) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `La calificación con ID ${idValue} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    const opportunity = dtoToSave.opportunity ?? existingGrade.opportunity;

    // Recalcular tipo y temporalidad automáticamente si se actualiza la calificación
    if (dtoToSave.grade !== undefined && dtoToSave.grade !== null) {
      if (dtoToSave.type === undefined) {
        dtoToSave.type =
          opportunity === 0 && dtoToSave.grade >= 6 ? 'CS' : 'RE';
      }
      if (dtoToSave.temporality === undefined) {
        dtoToSave.temporality =
          dtoToSave.grade >= 6 || opportunity === 2 ? 'FINAL' : 'TEMPORAL';
      }
    }

    const dataToUpdate = {
      ...dtoToSave,
      users_grades_updated_byTousers: { connect: { id: userId } },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de calificación',
    );

    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: GradesService.name,
      model: client.grade,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} grade`;
  }
}
