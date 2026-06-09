import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  resolvePagination,
  transformRelationIds,
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
  BulkCreateTeachingLoadDto,
  CreateTeachingLoadDto,
  QueryTeachingLoadDto,
  UpdateTeachingLoadDto,
} from './dto';

@Injectable()
export class TeachingLoadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
   📋 CREATE TEACHING LOAD (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Registra una carga académica asociando un docente, una materia y una clase.
   Validaciones previas:
   1. El perfil docente existe.
   2. El docente está activo (Staff.isActive === true).
   3. El docente está configurado frente a grupo (StaffTeachingProfile.isClassroomTeacher === true).
   4. La materia/plan de estudios existe.
   5. La clase existe.
   6. Materia y clase pertenecen al mismo programa educativo y semestre.
   7. Candado de exclusividad: la materia en esa clase no tiene ya un docente asignado.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateTeachingLoadDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      {
        staffTeachingProfileId: data.staffTeachingProfileId,
        studyPlanId: data.studyPlanId,
        classId: data.classId,
        createdBy: userId,
      },
      'Iniciando registro de carga académica',
    );

    // 🔹 PRE-CHECKS (Lecturas fuera de transacción)

    // PRE-CHECK 1, 2 y 3: Perfil docente existe, está activo y frente a grupo
    const teacherProfile = await client.staffTeachingProfile.findUnique({
      where: { id: data.staffTeachingProfileId },
      select: {
        id: true,
        isClassroomTeacher: true,
        staff: {
          select: {
            staff_status: {
              select: { isActive: true },
            },
          },
        },
      },
    });

    if (!teacherProfile) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `Carga académica denegada: El perfil docente con ID ${data.staffTeachingProfileId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    if (!teacherProfile.staff?.staff_status?.isActive) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Carga académica denegada: El docente no se encuentra activo.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (!teacherProfile.isClassroomTeacher) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Carga académica denegada: El docente no está configurado para impartir clases frente a grupo.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    // PRE-CHECK 4: Plan de estudios / Materia existe
    const studyPlan = await client.studyPlan.findUnique({
      where: { id: data.studyPlanId },
      select: { id: true, educationalProgramId: true, semesterId: true },
    });
    if (!studyPlan) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `Carga académica denegada: La materia/plan de estudios con ID ${data.studyPlanId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // PRE-CHECK 5: Clase existe
    const classData = await client.class.findUnique({
      where: { id: data.classId },
      select: { id: true, educationalProgramId: true, semesterId: true },
    });
    if (!classData) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `Carga académica denegada: La clase con ID ${data.classId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // PRE-CHECK 6: Coherencia de carrera (Programa Educativo) y Semestre
    if (studyPlan.educationalProgramId !== classData.educationalProgramId) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Carga académica denegada: La materia y la clase pertenecen a programas educativos distintos.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (studyPlan.semesterId !== classData.semesterId) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Carga académica denegada: El semestre de la materia no coincide con el semestre de la clase.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    // PRE-CHECK 7: Candado de exclusividad (Evitar que otra persona ya tenga esta materia en esta clase)
    const subjectAlreadyAssigned = await client.teachingLoad.findFirst({
      where: {
        studyPlanId: data.studyPlanId,
        classId: data.classId,
      },
      select: {
        id: true,
        staffTeachingProfileId: true,
        staff_teaching_profile: {
          select: {
            staff: {
              select: {
                persons: {
                  select: { firstName: true, firstLastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (subjectAlreadyAssigned) {
      const person =
        subjectAlreadyAssigned.staff_teaching_profile?.staff?.persons;
      const teacherName = person
        ? `${person.firstName} ${person.firstLastName}`.trim()
        : `Docente ID ${subjectAlreadyAssigned.staffTeachingProfileId}`;
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Carga académica denegada: La materia ya está asignada al docente "${teacherName}" para esta clase.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 Preparar objeto para guardar
    const dtoToSave = {
      staffTeachingProfileId: data.staffTeachingProfileId,
      studyPlanId: data.studyPlanId,
      classId: data.classId,
      createdBy: userId,
      updatedBy: userId,
    };

    // 🔹 Ejecutar creación
    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: TeachingLoadService.name,
      methodName: 'create',
      model: client.teachingLoad,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  /* ============================================================
   📋 FIND ALL TEACHING LOADS (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Obtiene el listado paginado y ordenado de toda la carga académica 
   desde la vista 'ViewTeachingLoad'.
   ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Resolver paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Opciones de consulta
    const queryOptions: Prisma.ViewTeachingLoadFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: [{ classKey: 'asc' }, { subjectName: 'asc' }],
    };

    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: TeachingLoadService.name,
      model: this.prisma.viewTeachingLoad,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
   📋 FIND MANY TEACHING LOADS (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Obtiene un listado filtrado, ordenado y paginado de la carga académica
   desde la vista 'ViewTeachingLoad' aplicando filtros dinámicos.
   ============================================================ */
  async findMany<T>(filters: QueryTeachingLoadDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 2. Construcción automática del objeto where
    const whereCondition = buildWhereMany<
      Prisma.ViewTeachingLoadWhereInput,
      QueryTeachingLoadDto
    >(filters, {
      contains: {
        subjectName: 'subjectName',
        fullName: 'fullName',
      },
      equals: {
        classCode: 'classKey',
        curp: 'curp',
        gender: 'gender',
      },
      orSearch: ['classKey', 'subjectName', 'fullName', 'curp'],
    });

    // 🔹 3. Opciones de consulta
    const queryOptions: Prisma.ViewTeachingLoadFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [{ classKey: 'asc' }, { subjectName: 'asc' }],
    };

    // 🔹 4. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: TeachingLoadService.name,
      model: this.prisma.viewTeachingLoad,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
   🔍 FIND ONE TEACHING LOAD BY CRITERIA (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Busca una carga académica específica por su identificador único
   en la vista 'ViewTeachingLoad'.
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

    // 🔹 3. Mapeo a campos únicos de la vista (solo id)
    const fieldMaps: TypeWhereFieldMap[] = [{ type: 'id', field: 'id' }];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.teachingLoad : client.viewTeachingLoad;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        staffTeachingProfileId: true,
        studyPlanId: true,
        classId: true,
        classes: {
          select: {
            classCode: true,
          },
        },
        study_plans: {
          select: {
            subjectKey: true,
            subjectName: true,
          },
        },
        staff_teaching_profile: {
          select: {
            staff: {
              select: {
                titleKey: true,
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

    // 🔹 5. Ejecución del helper genérico
    const result = await httpRequestFindUnique<any>({
      serviceName: TeachingLoadService.name,
      model,
      logger: this.logger,
      queryOptions,
      searchDto,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const load = result.data;
      const person = load.staff_teaching_profile?.staff?.persons;
      const fullName = person
        ? [person.firstName, person.firstLastName, person.secondLastName]
            .filter(Boolean)
            .join(' ')
        : null;

      result.data = {
        id: load.id,
        classKey: load.classes?.classCode ?? null,
        subjectName: load.study_plans?.subjectName ?? null,
        curp: person?.curp ?? null,
        titleKey: load.staff_teaching_profile?.staff?.titleKey ?? 'C.',
        fullName,
        gender: person?.gender ?? null,
        subjectId: load.study_plans?.subjectKey ?? null,
        staffTeachingProfileId: load.staffTeachingProfileId,
        studyPlanId: load.studyPlanId,
        classId: load.classId,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
   ✏️ UPDATE TEACHING LOAD (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Actualiza los datos de una carga académica específica.
   Valida la existencia de los nuevos registros, coherencia y exclusividad.
   ============================================================ */
  async update<T>(
    params: UpdateEntityParams<UpdateTeachingLoadDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, idValue, data, client, returnData } = extractUpdateParams(
      params,
      this.prisma,
    );
    const id = Number(idValue);

    // 1. Obtener la carga académica original para mezclar los campos no enviados
    const originalLoad = await client.teachingLoad.findUnique({
      where: { id },
      select: {
        id: true,
        staffTeachingProfileId: true,
        studyPlanId: true,
        classId: true,
      },
    });

    if (!originalLoad) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El registro de carga académica con ID ${id} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 2. Mezclar datos para las validaciones
    const merged = {
      staffTeachingProfileId:
        data.staffTeachingProfileId ?? originalLoad.staffTeachingProfileId,
      studyPlanId: data.studyPlanId ?? originalLoad.studyPlanId,
      classId: data.classId ?? originalLoad.classId,
    };

    // 3. Validar si cambiaron los datos
    const staffChanged =
      data.staffTeachingProfileId !== undefined &&
      data.staffTeachingProfileId !== originalLoad.staffTeachingProfileId;
    const studyPlanChanged =
      data.studyPlanId !== undefined &&
      data.studyPlanId !== originalLoad.studyPlanId;
    const classChanged =
      data.classId !== undefined && data.classId !== originalLoad.classId;

    // 4. Ejecutar validaciones correspondientes
    if (staffChanged) {
      const teacherProfile = await client.staffTeachingProfile.findUnique({
        where: { id: merged.staffTeachingProfileId },
        select: {
          id: true,
          isClassroomTeacher: true,
          staff: {
            select: {
              staff_status: {
                select: { isActive: true },
              },
            },
          },
        },
      });

      if (!teacherProfile) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `Carga académica denegada: El perfil docente con ID ${merged.staffTeachingProfileId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }

      if (!teacherProfile.staff?.staff_status?.isActive) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Carga académica denegada: El docente no se encuentra activo.',
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (!teacherProfile.isClassroomTeacher) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Carga académica denegada: El docente no está configurado para impartir clases frente a grupo.',
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // Si cambió materia o clase, validamos existencia y coherencia de programa/semestre
    if (studyPlanChanged || classChanged) {
      const [studyPlan, classData] = await Promise.all([
        client.studyPlan.findUnique({
          where: { id: merged.studyPlanId },
          select: { id: true, educationalProgramId: true, semesterId: true },
        }),
        client.class.findUnique({
          where: { id: merged.classId },
          select: { id: true, educationalProgramId: true, semesterId: true },
        }),
      ]);

      if (studyPlanChanged && !studyPlan) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `Carga académica denegada: La materia/plan de estudios con ID ${merged.studyPlanId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }

      if (classChanged && !classData) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `Carga académica denegada: La clase con ID ${merged.classId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }

      // Validar coherencia
      if (studyPlan && classData) {
        if (studyPlan.educationalProgramId !== classData.educationalProgramId) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message:
                'Carga académica denegada: La materia y la clase pertenecen a programas educativos distintos.',
              errorCode: 'CONFLICT',
            }),
          );
        }

        if (studyPlan.semesterId !== classData.semesterId) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message:
                'Carga académica denegada: El semestre de la materia no coincide con el semestre de la clase.',
              errorCode: 'CONFLICT',
            }),
          );
        }
      }
    }

    // Si cambió cualquiera, validar exclusividad (que la materia en esa clase no esté asignada a otra persona)
    if (studyPlanChanged || classChanged || staffChanged) {
      const subjectAlreadyAssigned = await client.teachingLoad.findFirst({
        where: {
          studyPlanId: merged.studyPlanId,
          classId: merged.classId,
          NOT: { id },
        },
        select: {
          id: true,
          staffTeachingProfileId: true,
          staff_teaching_profile: {
            select: {
              staff: {
                select: {
                  persons: {
                    select: { firstName: true, firstLastName: true },
                  },
                },
              },
            },
          },
        },
      });

      if (subjectAlreadyAssigned) {
        const person =
          subjectAlreadyAssigned.staff_teaching_profile?.staff?.persons;
        const teacherName = person
          ? `${person.firstName} ${person.firstLastName}`.trim()
          : `Docente ID ${subjectAlreadyAssigned.staffTeachingProfileId}`;
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Carga académica denegada: La materia ya está asignada al docente "${teacherName}" para esta clase.`,
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // 5. Preparar objeto para actualizar transformando las relaciones a Prisma 7
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_teaching_load_updated_byTousers: { connect: { id: userId } },
    };

    // 6. Ejecutar actualización
    return await httpRequestUpdate<typeof dataToUpdate, T>({
      serviceName: TeachingLoadService.name,
      model: client.teachingLoad,
      logger: this.logger,
      idValue: id,
      data: dataToUpdate,
      returnData,
    });
  }

  async bulkCreate<T>(
    params: CreateEntityParams<BulkCreateTeachingLoadDto>,
  ): Promise<ApiResponse<T[]>> {
    const { userId, data } = extractCreateParams(
      params,
      this.prisma,
    );

    const items = data.items || [];
    if (items.length === 0) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'No se enviaron elementos para registrar la carga académica.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    this.logger.info(
      {
        count: items.length,
        createdBy: userId,
      },
      'Iniciando registro de carga académica en lote',
    );

    // 1. Extraer todos los IDs únicos para realizar lecturas consolidadas
    const teacherIds = Array.from(new Set(items.map((it) => it.staffTeachingProfileId)));
    const studyPlanIds = Array.from(new Set(items.map((it) => it.studyPlanId)));
    const classIds = Array.from(new Set(items.map((it) => it.classId)));

    // 2. Ejecutar validaciones e inserciones en una transacción única
    const createdLoads = await this.prisma.$transaction(async (tx) => {
      // Consultas consolidadas
      const [teachers, studyPlans, classes, existingLoads] = await Promise.all([
        tx.staffTeachingProfile.findMany({
          where: { id: { in: teacherIds } },
          select: {
            id: true,
            isClassroomTeacher: true,
            staff: {
              select: {
                staff_status: {
                  select: { isActive: true },
                },
              },
            },
          },
        }),
        tx.studyPlan.findMany({
          where: { id: { in: studyPlanIds } },
          select: { id: true, educationalProgramId: true, semesterId: true, subjectName: true },
        }),
        tx.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, educationalProgramId: true, semesterId: true, classCode: true },
        }),
        tx.teachingLoad.findMany({
          where: {
            classId: { in: classIds },
            studyPlanId: { in: studyPlanIds },
          },
          select: {
            id: true,
            studyPlanId: true,
            classId: true,
            staffTeachingProfileId: true,
            staff_teaching_profile: {
              select: {
                staff: {
                  select: {
                    persons: {
                      select: { firstName: true, firstLastName: true },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      // 3. Crear mapas de búsqueda en memoria para O(1) de velocidad
      const teacherMap = new Map(teachers.map((t) => [t.id, t]));
      const studyPlanMap = new Map(studyPlans.map((sp) => [sp.id, sp]));
      const classMap = new Map(classes.map((c) => [c.id, c]));

      // Mapa de asignaciones existentes agrupado por "classId-studyPlanId"
      const existingMap = new Map(
        existingLoads.map((el) => [`${el.classId}-${el.studyPlanId}`, el]),
      );

      // 4. Validaciones en memoria
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prefixMsg = `Fila ${i + 1}: `;

        // Validar Perfil Docente
        const teacher = teacherMap.get(item.staffTeachingProfileId);
        if (!teacher) {
          throw new NotFoundException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El perfil docente con ID ${item.staffTeachingProfileId} no existe.`,
              errorCode: 'NOT_FOUND',
            }),
          );
        }
        if (!teacher.staff?.staff_status?.isActive) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El docente no se encuentra activo.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        if (!teacher.isClassroomTeacher) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El docente no está configurado para impartir clases frente a grupo.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        // Validar Materia / Plan de Estudios
        const sp = studyPlanMap.get(item.studyPlanId);
        if (!sp) {
          throw new NotFoundException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La materia con ID ${item.studyPlanId} no existe.`,
              errorCode: 'NOT_FOUND',
            }),
          );
        }

        // Validar Clase
        const cl = classMap.get(item.classId);
        if (!cl) {
          throw new NotFoundException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La clase con ID ${item.classId} no existe.`,
              errorCode: 'NOT_FOUND',
            }),
          );
        }

        // Validar Coherencia de Programa Educativo y Semestre
        if (sp.educationalProgramId !== cl.educationalProgramId) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La materia "${sp.subjectName}" y la clase "${cl.classCode}" pertenecen a programas educativos distintos.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        if (sp.semesterId !== cl.semesterId) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El semestre de la materia "${sp.subjectName}" no coincide con el de la clase "${cl.classCode}".`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        // Validar Exclusividad (Que la materia en esa clase no esté ya asignada a otro docente)
        const existing = existingMap.get(`${item.classId}-${item.studyPlanId}`);
        if (existing) {
          const person = existing.staff_teaching_profile?.staff?.persons;
          const teacherName = person
            ? `${person.firstName} ${person.firstLastName}`.trim()
            : `Docente ID ${existing.staffTeachingProfileId}`;

          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La materia "${sp.subjectName}" ya está asignada al docente "${teacherName}" para esta clase.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
      }

      // 5. Inserciones
      const records: any[] = [];
      for (const item of items) {
        const created = await tx.teachingLoad.create({
          data: {
            staffTeachingProfileId: item.staffTeachingProfileId,
            studyPlanId: item.studyPlanId,
            classId: item.classId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        records.push(created);
      }
      return records;
    });

    return {
      success: true,
      status: 'success',
      statusCode: 201,
      message: `Se registraron exitosamente ${createdLoads.length} asignaciones de carga académica.`,
      data: createdLoads as unknown as T[],
    };
  }
}
