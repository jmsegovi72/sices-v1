import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ViewStudent } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import { PaginationDto, SearchDto } from '@/common/dtos';
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
  reassignListNumbers,
  resolvePagination,
} from '@/common/helpers';
import {
  ApiResponse,
  CreateEntityParams,
  FindEntityParams,
  UpdateEntityParams,
} from '@/common/interfaces';
import { prismaErrorHandleCatch } from '@/common/prisma';
import { TypeWhereFieldMap } from '@/common/types';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentsService } from '@/students/students.service';
import {
  CreateBatchStudentEnrollmentDto,
  CreateEnrollmentDto,
  QueryEnrollmentDto,
  UpdateEnrollmentDto,
} from './dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly studentsService: StudentsService,
  ) {}
  /* ============================================================
   📋 CREATE ENROLLMENT (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Inscribe un alumno en una clase con validaciones previas:
   1. Alumno existe y está activo
   2. Clase existe
   3. Alumno no inscrito en el mismo periodo
   4. Cupo disponible
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateEnrollmentDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      {
        studentId: data.studentId,
        classCode: data.classCode,
        createdBy: userId,
      },
      'Iniciando inscripción de alumno',
    );

    // 🔹 PRE-CHECKS (fuera de transacción — solo lectura)

    // PRE-CHECK 1: Alumno existe y está activo
    const studentResponse = await this.studentsService.findOneBy<ViewStudent>({
      searchDto: plainToClass(SearchDto, { search: String(data.studentId) }),
    });

    if (!studentResponse.data) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: El alumno con ID ${data.studentId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (studentResponse.data.isActive !== true) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: El estudiante ${studentResponse.data.fullName} (id: ${data.studentId}) no está activo. Estado: ${studentResponse.data.statusDescription}.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // Obtener los datos de carrera del estudiante de la base de datos
    const studentDb = await client.student.findUnique({
      where: { id: data.studentId },
      select: { educationalProgramId: true },
    });

    // PRE-CHECK 2: Clase existe
    const classData = await client.class.findUnique({
      where: { classCode: data.classCode },
      select: {
        id: true,
        semiannualPeriodId: true,
        schoolYearId: true,
        semesterId: true,
        educationalProgramId: true,
      },
    });

    if (!classData) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: La clase con código ${data.classCode} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    const {
      id: classId,
      semiannualPeriodId,
      schoolYearId,
      semesterId,
      educationalProgramId,
    } = classData;

    // PRE-CHECK 2.5: Validar que pertenezcan a la misma carrera
    if (studentDb?.educationalProgramId !== educationalProgramId) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: El estudiante pertenece a una carrera/licenciatura diferente a la de la clase.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // PRE-CHECK 3: Alumno no inscrito en este periodo
    const existingEnrollment = await client.enrollment.findFirst({
      where: {
        studentId: data.studentId,
        classes: { semiannualPeriodId, schoolYearId },
      },
      select: {
        id: true,
        classes: {
          select: {
            classCode: true,
            semiannual_periods: {
              select: { semiannualPeriod: true },
            },
          },
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Matrícula denegada: El estudiante ${studentResponse.data.fullName} (id: ${data.studentId}) ya tiene matrícula activa en la clase '${existingEnrollment.classes.classCode}' para el período ${existingEnrollment.classes.semiannual_periods.semiannualPeriod}.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // PRE-CHECK 3.5: Validar que no se inscriba a un semestre anterior al cursado
    const highestPastEnrollment = await client.enrollment.findFirst({
      where: { studentId: data.studentId },
      select: { classes: { select: { semesterId: true } } },
      orderBy: { classes: { semesterId: 'desc' } },
    });

    if (
      highestPastEnrollment &&
      semesterId < highestPastEnrollment.classes.semesterId
    ) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: El estudiante ya ha cursado el semestre ${highestPastEnrollment.classes.semesterId}. No puede inscribirse en un semestre anterior (${semesterId}).`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // PRE-CHECK 4: Cupo disponible
    const classCapacity = Number(process.env.DEFAULT_CLASS_CAPACITY ?? 25);
    const currentCount = await client.enrollment.count({
      where: { classId },
    });

    if (currentCount >= classCapacity) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Inscripción denegada: La clase '${data.classCode}' ha alcanzado el límite máximo de ${classCapacity} alumnos.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 Preparar objeto final
    const dtoToSave = {
      studentId: data.studentId,
      classId,
      listNumber: 0,
      enrollmentDate: data.enrollmentDate
        ? new Date(data.enrollmentDate)
        : new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { studentId: data.studentId, classCode: data.classCode, classId },
      'Datos para inscripción de alumno',
    );

    // 🔹 Lógica de escritura (puede ejecutarse sobre una transacción externa o una nueva)
    const executeWrites = async (writeClient: any) => {
      // 1. Actualizar status NI → PR si aplica
      if (studentResponse.data!.statusKey === 'NI' && semesterId > 1) {
        await writeClient.student.update({
          where: { id: data.studentId },
          data: {
            student_status: { connect: { id: 7 } },
            users_students_updated_byTousers: { connect: { id: userId } },
          },
        });
      }

      // 2. Crear enrollment
      return await httpRequestCreate<typeof dtoToSave, T>({
        serviceName: EnrollmentsService.name,
        methodName: 'create',
        model: writeClient.enrollment,
        logger: this.logger,
        data: dtoToSave,
        returnData,
      });
    };

    // 🚨 REUTILIZACIÓN DE TRANSACCIÓN: Si ya viene tx en opciones, la usamos; si no, abrimos una nueva
    if (params.options?.tx) {
      return await executeWrites(params.options.tx);
    } else {
      return await this.prisma.$transaction(async (tx) => {
        return await executeWrites(tx);
      });
    }
  }

  /* ============================================================
    🆕📦 CREATE BATCH ENROLLMENTS (SICES V3)
  ============================================================ */
  async createBatchEnrollments(
    userId: number,
    createBatchDto: CreateBatchStudentEnrollmentDto,
  ): Promise<ApiResponse<any>> {
    try {
      // 1. 🛡️ INICIO DE LA TRANSACCIÓN ÚNICA DEL LOTE
      const countEnrollments = await this.prisma.$transaction(async (tx) => {
        // 2. Bucle secuencial para evitar condiciones de carrera en cupos
        for (const dto of createBatchDto.enrollments) {
          await this.create({
            dto,
            userId,
            options: {
              returnData: false,
              tx, // 👈 Inyectamos la transacción para que 'create' la reutilice
            },
          });
        }
        return createBatchDto.enrollments.length;
      });

      // 3. Respuesta de éxito
      return qwikMessageResponse({
        success: true,
        message: `Se matricularon ${countEnrollments} estudiantes correctamente.`,
        data: { records: countEnrollments },
      });
    } catch (error) {
      // Rollback automático al lanzar la excepción
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw prismaErrorHandleCatch(
        EnrollmentsService.name,
        'createBatchEnrollments',
        this.logger,
        { userId, count: createBatchDto.enrollments.length },
        error,
      );
    }
  }

  /* ============================================================
  📋 FIND ALL ENROLLMENTS (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Obtiene un listado de inscripciones desde la vista 'ViewEnrollment'.
  - Usa paginación segura
  - Respuesta estandarizada
  - No requiere mapper (la vista ya entrega datos limpios)
  - El interceptor global transforma BigInt y fechas
  ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Resolver paginación segura
    const pagination = resolvePagination(paginationDto);
    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewEnrollmentFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: [{ classCode: 'asc' }, { listNumber: 'asc' }],
    };
    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: EnrollmentsService.name,
      model: this.prisma.viewEnrollment,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }
  /* ============================================================
  📋 FIND MANY ENROLLMENTS (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Listado de inscripciones con filtros dinámicos.
  ============================================================ */
  async findMany<T>(filters: QueryEnrollmentDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Resolver paginación segura
    const pagination = resolvePagination(filters);
    // 🤖 2. Construcción automática de WHERE
    const whereCondition = buildWhereMany<
      Prisma.ViewEnrollmentWhereInput,
      QueryEnrollmentDto
    >(filters, {
      contains: {
        firstName: 'firstName',
        firstLastName: 'firstLastName',
        secondLastName: 'secondLastName',
        educationalProgram: 'educationalProgram',
        academicDiscipline: 'academicDiscipline',
        educationLevel: 'educationLevel',
      },
      equals: {
        curp: 'curp',
        codeNumber: 'studentNumber',
        classCode: 'classCode',
        schoolYear: 'schoolYear',
        semiannualPeriod: 'semiannualPeriod',
        gender: 'gender',
        semester: 'semester',
      },
      orSearch: ['fullName', 'curp', 'studentNumber', 'classCode'],
    });
    // 🔹 3. Query Prisma
    const queryOptions: Prisma.ViewEnrollmentFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [{ classCode: 'asc' }, { listNumber: 'asc' }],
    };
    // 🔹 4. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: EnrollmentsService.name,
      model: this.prisma.viewEnrollment,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
  🎓 FIND ONE BY (SICES V3 - UNIQUE)
  ------------------------------------------------------------
  📌 Descripción:
  Busca una inscripción utilizando campos @unique de
  la vista.
  ============================================================ */
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
    // 🔹 3. Mapeo a campos @unique de la vista/tabla
    const fieldMaps: TypeWhereFieldMap[] = [
      { type: 'id', field: 'id' }, // ← @unique ✅
    ];
    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);
    // 🔹 5. Ejecución
    const isLight = params.options?.light === true;
    const model = isLight ? client.enrollment : client.viewEnrollment;

    const queryOptions: any = { where: whereCondition };
    if (isLight) {
      queryOptions.select = {
        id: true,
        studentId: true,
        classId: true,
        listNumber: true,
        enrollmentDate: true,
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
                firstName: true,
                firstLastName: true,
                secondLastName: true,
              },
            },
          },
        },
      };
    }

    const result = await httpRequestFindUnique<any>({
      serviceName: EnrollmentsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const enrollment = result.data;
      result.data = {
        id: enrollment.id,
        studentId: enrollment.studentId,
        classId: enrollment.classId,
        listNumber: enrollment.listNumber,
        enrollmentDate: enrollment.enrollmentDate,
        classCode: enrollment.classes?.classCode ?? null,
        studentNumber: enrollment.students?.codeNumber ?? null,
        studentName: enrollment.students?.persons
          ? `${enrollment.students.persons.firstName} ${enrollment.students.persons.firstLastName} ${enrollment.students.persons.secondLastName || ''}`.trim()
          : null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  async update<R = any>(
    params: UpdateEntityParams<UpdateEnrollmentDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, idFieldName, userId } = extractUpdateParams(
      params,
      this.prisma,
    );
    const id = Number(idValue);

    // 1. Verificar existencia del registro original e incluir su clase actual
    const originalEnrollment = await client.enrollment.findUnique({
      where: { id },
      include: {
        classes: {
          select: {
            classCode: true,
            id: true,
            semesterId: true,
            schoolYearId: true,
            semiannualPeriodId: true,
            educationalProgramId: true,
          },
        },
      },
    });

    if (!originalEnrollment) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El registro de inscripción con ID ${id} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const studentIdToValidate = data.studentId ?? originalEnrollment.studentId;
    const classCodeToValidate =
      data.classCode ?? originalEnrollment.classes.classCode;

    const studentIdChanged =
      data.studentId && data.studentId !== originalEnrollment.studentId;
    const classCodeChanged =
      data.classCode && data.classCode !== originalEnrollment.classes.classCode;
    const needsValidations = studentIdChanged || classCodeChanged;
    const needsReassignment = classCodeChanged || studentIdChanged;

    let targetClass = originalEnrollment.classes;

    // 2. Ejecutar validaciones si hubo cambios en clase o estudiante
    if (needsValidations) {
      // Validar Estudiante existe y está activo
      const studentResponse = await this.studentsService.findOneBy<ViewStudent>(
        {
          searchDto: plainToClass(SearchDto, {
            search: String(studentIdToValidate),
          }),
        },
      );

      if (!studentResponse.data) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Inscripción denegada: El alumno con ID ${studentIdToValidate} no existe.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (studentResponse.data.isActive !== true) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Inscripción denegada: El estudiante ${studentResponse.data.fullName} (id: ${studentIdToValidate}) no está activo. Estado: ${studentResponse.data.statusDescription}.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      const studentDb = await client.student.findUnique({
        where: { id: studentIdToValidate },
        select: { educationalProgramId: true },
      });

      // Validar nueva clase si cambió
      if (classCodeChanged) {
        const foundClass = await client.class.findUnique({
          where: { classCode: classCodeToValidate },
          select: {
            classCode: true,
            id: true,
            semiannualPeriodId: true,
            schoolYearId: true,
            semesterId: true,
            educationalProgramId: true,
          },
        });

        if (!foundClass) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `Inscripción denegada: La clase con código ${classCodeToValidate} no existe.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        targetClass = foundClass;
      }

      // Validar Carrera
      if (
        studentDb?.educationalProgramId !== targetClass.educationalProgramId
      ) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Inscripción denegada: El estudiante pertenece a una carrera/licenciatura diferente a la de la clase.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      // Validar Semestre no anterior
      const highestPastEnrollment = await client.enrollment.findFirst({
        where: {
          studentId: studentIdToValidate,
          id: { not: id }, // Excluir la inscripción que estamos actualizando
        },
        select: { classes: { select: { semesterId: true } } },
        orderBy: { classes: { semesterId: 'desc' } },
      });

      if (
        highestPastEnrollment &&
        targetClass.semesterId < highestPastEnrollment.classes.semesterId
      ) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Inscripción denegada: El estudiante ya ha cursado el semestre ${highestPastEnrollment.classes.semesterId}. No puede inscribirse en un semestre anterior (${targetClass.semesterId}).`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      // Validar que no tenga otra inscripción activa en el mismo periodo
      const duplicateEnrollment = await client.enrollment.findFirst({
        where: {
          studentId: studentIdToValidate,
          classes: {
            semiannualPeriodId: targetClass.semiannualPeriodId,
            schoolYearId: targetClass.schoolYearId,
          },
          id: { not: id }, // Excluir la inscripción actual
        },
      });

      if (duplicateEnrollment) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Matrícula denegada: El estudiante ${studentResponse.data.fullName} ya tiene otra matrícula activa en este período.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      // Validar cupo en la nueva clase si cambió
      if (classCodeChanged) {
        const classCapacity = Number(process.env.DEFAULT_CLASS_CAPACITY ?? 25);
        const currentCount = await client.enrollment.count({
          where: { classId: targetClass.id },
        });

        if (currentCount >= classCapacity) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `Inscripción denegada: La clase '${classCodeToValidate}' ha alcanzado el límite máximo de ${classCapacity} alumnos.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
      }
    }

    // 3. Preparar payload para actualización
    const { classCode, ...dataToSave } = data;
    const dataToUpdate = {
      ...dataToSave,
      ...(classCode && { classId: targetClass.id }),
      updatedBy: userId,
    };

    // 4. Ejecutar actualización y reasignación de números de lista bajo una única transacción
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await httpRequestUpdate<typeof dataToUpdate, R>({
          serviceName: EnrollmentsService.name,
          model: tx.enrollment,
          logger: this.logger,
          idValue: id,
          data: dataToUpdate,
          returnData: false,
          idFieldName,
        });

        if (needsReassignment) {
          if (classCodeChanged) {
            // Reasignar números del grupo del cual el alumno salió
            await reassignListNumbers(tx, originalEnrollment.classId);
          }
          // Reasignar números del grupo al cual el alumno ingresó o cambió de orden
          await reassignListNumbers(tx, targetClass.id);
        }

        return updated;
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw prismaErrorHandleCatch(
        EnrollmentsService.name,
        'update',
        this.logger,
        { id, data, oldClassId: originalEnrollment.classId },
        error,
      );
    }
  }

  /* ============================================================
 📋 REASSIGN LIST NUMBERS (SICES V3)
 ------------------------------------------------------------
 📌 Reasigna números de lista a todos los alumnos de una clase
 ordenados alfabéticamente.
============================================================ */
  async reassignListNumbers(classCode: string): Promise<ApiResponse<void>> {
    // 🔹 1. Verificar que la clase existe y tiene alumnos
    const classRecord = await this.prisma.class.findUnique({
      where: { classCode },
      select: { id: true },
    });

    if (!classRecord) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `La clase |${classCode}| no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const count = await this.prisma.enrollment.count({
      where: { classId: classRecord.id },
    });

    if (count === 0) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `La clase |${classCode}| no tiene alumnos inscritos.`,
          errorCode: 'NOT_FOUND',
          invalidField: 'classCode',
          providedValue: classCode,
        }),
      );
    }

    // 🔹 2. Reasignar en transacción atómica
    await this.prisma.$transaction(async (tx) => {
      await reassignListNumbers(tx, classRecord.id);
    });

    return qwikMessageResponse({
      success: true,
      message: `Números de lista asignados correctamente para la clase |${classCode}|.`,
    });
  }
}
