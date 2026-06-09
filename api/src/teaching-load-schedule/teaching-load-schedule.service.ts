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
  BulkCreateTeachingLoadScheduleDto,
  CreateTeachingLoadScheduleDto,
  QueryTeachingLoadScheduleDto,
  UpdateTeachingLoadScheduleDto,
} from './dto';

@Injectable()
export class TeachingLoadScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
   📋 CREATE TEACHING LOAD SCHEDULE (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Registra el horario de una carga académica (día, hora y aula).
   Validaciones previas (Pre-checks):
   1. La carga académica existe. (409)
   2. El docente de la carga está activo y frente a grupo. (409)
   3. Los catálogos (día, hora, aula) existen. (409)
   4. Choque de docente: El docente no tiene otra clase a la misma hora/día en el mismo año/periodo. (409)
   5. Choque de aula: El aula no está ocupada en ese día y hora en el mismo año/periodo. (409)
   6. Choque de grupo: El grupo no tiene otra materia en el mismo día/hora. (409)
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateTeachingLoadScheduleDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      {
        teachingLoadId: data.teachingLoadId,
        dayId: data.dayId,
        hourId: data.hourId,
        classroomId: data.classroomId,
        createdBy: userId,
      },
      'Iniciando registro de horario de carga académica',
    );

    // 🔹 PRE-CHECK 1 y 2: Carga académica existe, docente activo y frente a grupo, y periodo semestral/año escolar
    const teachingLoad = await client.teachingLoad.findUnique({
      where: { id: data.teachingLoadId },
      select: {
        id: true,
        staffTeachingProfileId: true,
        classId: true,
        classes: {
          select: {
            schoolYearId: true,
            semiannualPeriodId: true,
          },
        },
        staff_teaching_profile: {
          select: {
            isClassroomTeacher: true,
            staff: {
              select: {
                staff_status: {
                  select: { isActive: true },
                },
              },
            },
          },
        },
      },
    });

    if (!teachingLoad) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Registro de horario denegado: La carga académica con ID ${data.teachingLoadId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (!teachingLoad.staff_teaching_profile?.staff?.staff_status?.isActive) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Registro de horario denegado: El docente asociado a la carga académica no se encuentra activo.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (!teachingLoad.staff_teaching_profile?.isClassroomTeacher) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message:
            'Registro de horario denegado: El docente asociado a la carga académica no está configurado para impartir clases frente a grupo.',
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 3: Existencia física en catálogos (Día, Hora, Aula)
    const [weekdayExists, weeklyHourExists, classroomExists] =
      await Promise.all([
        client.weekDay.findUnique({ where: { id: data.dayId } }),
        client.weeklyHour.findUnique({ where: { id: data.hourId } }),
        client.classroom.findUnique({ where: { id: data.classroomId } }),
      ]);

    if (!weekdayExists) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Registro de horario denegado: El día con ID ${data.dayId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (!weeklyHourExists) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Registro de horario denegado: La hora/módulo con ID ${data.hourId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    if (!classroomExists) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Registro de horario denegado: El aula con ID ${data.classroomId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 4: Candado de choque del Docente (Mismo Año y Periodo Semestral)
    const teacherClash = await client.teachingLoadSchedule.findFirst({
      where: {
        dayId: data.dayId,
        hourId: data.hourId,
        teaching_load: {
          staffTeachingProfileId: teachingLoad.staffTeachingProfileId,
          classes: {
            schoolYearId: teachingLoad.classes.schoolYearId,
            semiannualPeriodId: teachingLoad.classes.semiannualPeriodId,
          },
        },
      },
      select: {
        id: true,
        teaching_load: {
          select: {
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
        },
      },
    });

    if (teacherClash) {
      const person =
        teacherClash.teaching_load?.staff_teaching_profile?.staff?.persons;
      const teacherName = person
        ? `${person.firstName} ${person.firstLastName}`.trim()
        : `Docente ID ${teachingLoad.staffTeachingProfileId}`;
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Conflicto de horario: El docente "${teacherName}" ya tiene programada una clase en el día y hora seleccionados.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 5: Candado de choque de Aula (Mismo Año y Periodo Semestral)
    const classroomClash = await client.teachingLoadSchedule.findFirst({
      where: {
        dayId: data.dayId,
        hourId: data.hourId,
        classroomId: data.classroomId,
        teaching_load: {
          classes: {
            schoolYearId: teachingLoad.classes.schoolYearId,
            semiannualPeriodId: teachingLoad.classes.semiannualPeriodId,
          },
        },
      },
      select: {
        id: true,
        classrooms: {
          select: { name: true },
        },
      },
    });

    if (classroomClash) {
      const classroomName =
        classroomClash.classrooms?.name ?? `Aula ID ${data.classroomId}`;
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Conflicto de horario: El aula "${classroomName}" ya está ocupada en el día y hora seleccionados.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 PRE-CHECK 6: Candado de choque de Grupo/Clase (Mismo Grupo)
    const classClash = await client.teachingLoadSchedule.findFirst({
      where: {
        dayId: data.dayId,
        hourId: data.hourId,
        teaching_load: {
          classId: teachingLoad.classId,
        },
      },
      select: {
        id: true,
        teaching_load: {
          select: {
            classes: {
              select: { classCode: true },
            },
          },
        },
      },
    });

    if (classClash) {
      const classCode =
        classClash.teaching_load?.classes?.classCode ??
        `Clase ID ${teachingLoad.classId}`;
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Conflicto de horario: El grupo "${classCode}" ya tiene otra materia programada en el día y hora seleccionados.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 🔹 Preparar datos y transformar relaciones para Prisma 7
    const { createdBy, ...dataToTransform } = data as any;
    const relationalData = transformRelationIds(dataToTransform);
    const dtoToSave = {
      ...relationalData,
      users_teaching_load_schedule_created_byTousers: {
        connect: { id: userId },
      },
      users_teaching_load_schedule_updated_byTousers: {
        connect: { id: userId },
      },
    } as unknown as Prisma.TeachingLoadScheduleCreateInput;

    // 🔹 Ejecutar creación
    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: TeachingLoadScheduleService.name,
      methodName: 'create',
      model: client.teachingLoadSchedule,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  /* ============================================================
   📋 FIND ALL TEACHING LOAD SCHEDULES (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Obtiene el listado paginado de toda la programación de horarios
   desde la vista 'ViewTeachingLoadSchedule'.
   ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(paginationDto);

    const queryOptions: Prisma.ViewTeachingLoadScheduleFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: [{ dayOrder: 'asc' }, { hour: 'asc' }],
    };

    return await httpRequestFindMany<T>({
      serviceName: TeachingLoadScheduleService.name,
      model: this.prisma.viewTeachingLoadSchedule,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
   📋 FIND MANY TEACHING LOAD SCHEDULES (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Obtiene un listado filtrado, ordenado y paginado de los horarios
   desde la vista 'ViewTeachingLoadSchedule' con filtros dinámicos.
   ============================================================ */
  async findMany<T>(
    filters: QueryTeachingLoadScheduleDto,
  ): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewTeachingLoadScheduleWhereInput,
      QueryTeachingLoadScheduleDto
    >(filters, {
      contains: {
        subjectName: 'subjectName',
        fullName: 'fullName',
        classroomName: 'classroomName',
      },
      equals: {
        classCode: 'classKey',
        curp: 'curp',
        gender: 'gender',
        day: 'day',
        hour: 'hour',
        schoolYear: 'schoolYear',
        semiannualPeriod: 'semiannualPeriod',
      },
      orSearch: [
        'classKey',
        'subjectName',
        'fullName',
        'curp',
        'classroomName',
      ],
    });

    const queryOptions: Prisma.ViewTeachingLoadScheduleFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [{ dayOrder: 'asc' }, { hour: 'asc' }],
    };

    return await httpRequestFindMany<T>({
      serviceName: TeachingLoadScheduleService.name,
      model: this.prisma.viewTeachingLoadSchedule,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
   🔍 FIND ONE TEACHING LOAD SCHEDULE BY CRITERIA (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Busca un horario específico por su ID único en la vista 'ViewTeachingLoadSchedule'.
   ============================================================ */
  async findOneBy<T>(
    params: FindEntityParams<SearchDto>,
  ): Promise<ApiResponse<T | null>> {
    const { searchDto, client, throwIfNotFound } = extractFindParams(
      params,
      this.prisma,
    );

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
    const model = isLight ? client.teachingLoadSchedule : client.viewTeachingLoadSchedule;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        teachingLoadId: true,
        dayId: true,
        hourId: true,
        classroomId: true,
        classrooms: {
          select: {
            name: true,
            classroomKey: true,
          },
        },
        week_days: {
          select: {
            dayKey: true,
            sortOrder: true,
          },
        },
        weekly_hours: {
          select: {
            hour_key: true,
          },
        },
        teaching_load: {
          select: {
            studyPlanId: true,
            classId: true,
            classes: {
              select: {
                classCode: true,
                group: true,
                shift: true,
                educationalProgramId: true,
                schoolYearId: true,
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
                    modalities: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                semiannual_periods: {
                  select: {
                    semiannualPeriod: true,
                  },
                },
              },
            },
            study_plans: {
              select: {
                subjectKey: true,
                subjectName: true,
                displayOrder: true,
                semesterId: true,
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
          },
        },
      };
    }

    const result = await httpRequestFindUnique<any>({
      serviceName: TeachingLoadScheduleService.name,
      model,
      logger: this.logger,
      queryOptions,
      searchDto,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const schedule = result.data;
      const load = schedule.teaching_load;
      const person = load?.staff_teaching_profile?.staff?.persons;
      const fullName = person
        ? [person.firstName, person.firstLastName, person.secondLastName]
            .filter(Boolean)
            .join(' ')
        : null;

      let schoolYear: string | null = null;
      if (load?.classes?.schoolYearId) {
        const sy = await client.schoolYear.findUnique({
          where: { id: load.classes.schoolYearId },
          select: { schoolYear: true },
        });
        schoolYear = sy?.schoolYear ?? null;
      }

      const ep = load?.classes?.educational_programs;
      const discipline = ep?.academic_disciplines;

      result.data = {
        id: schedule.id,
        fullName,
        curp: person?.curp ?? null,
        titleKey: load?.staff_teaching_profile?.staff?.titleKey ?? 'C.',
        gender: person?.gender ?? null,
        subjectName: load?.study_plans?.subjectName ?? null,
        subjectKey: load?.study_plans?.subjectKey ?? null,
        classKey: load?.classes?.classCode ?? null,
        subjectOrder: load?.study_plans?.displayOrder ?? null,
        semester: load?.study_plans?.semesterId ?? null,
        day: schedule.week_days?.dayKey ?? null,
        dayOrder: schedule.week_days?.sortOrder ?? null,
        hour: schedule.weekly_hours?.hour_key ?? null,
        group: load?.classes?.group ?? null,
        shift: load?.classes?.shift ?? null,
        classroomName: schedule.classrooms?.name ?? null,
        classroomKey: schedule.classrooms?.classroomKey ?? null,
        modality: ep?.modalities?.name ?? null,
        academicDiscipline: discipline?.name ?? null,
        offeredEducationLevel: discipline?.school_offered_levels?.offeredEducationLevel ?? null,
        schoolYear,
        semiannualPeriod: load?.classes?.semiannual_periods?.semiannualPeriod ?? null,
        educationalProgram: ep?.name ?? null,
        subjectId: load?.study_plans?.subjectKey ?? null,
        teachingLoadId: schedule.teachingLoadId,
        dayId: schedule.dayId,
        hourId: schedule.hourId,
        classroomId: schedule.classroomId,
        studyPlanId: load?.studyPlanId ?? null,
        educationalProgramId: load?.classes?.educationalProgramId ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
   ✏️ UPDATE TEACHING LOAD SCHEDULE (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Actualiza los datos de un horario específico (día, hora o aula).
   Valida la existencia de los nuevos registros y verifica choques de horario.
   ============================================================ */
  async update<T>(
    params: UpdateEntityParams<UpdateTeachingLoadScheduleDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, idValue, data, client, returnData } = extractUpdateParams(
      params,
      this.prisma,
    );
    const id = Number(idValue);

    // 1. Obtener registro original
    const originalSchedule = await client.teachingLoadSchedule.findUnique({
      where: { id },
      select: {
        id: true,
        teachingLoadId: true,
        dayId: true,
        hourId: true,
        classroomId: true,
      },
    });

    if (!originalSchedule) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El registro de horario con ID ${id} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 2. Combinar campos para validación
    const merged = {
      teachingLoadId: data.teachingLoadId ?? originalSchedule.teachingLoadId,
      dayId: data.dayId ?? originalSchedule.dayId,
      hourId: data.hourId ?? originalSchedule.hourId,
      classroomId: data.classroomId ?? originalSchedule.classroomId,
    };

    const teachingLoadChanged =
      data.teachingLoadId !== undefined &&
      data.teachingLoadId !== originalSchedule.teachingLoadId;
    const dayChanged =
      data.dayId !== undefined && data.dayId !== originalSchedule.dayId;
    const hourChanged =
      data.hourId !== undefined && data.hourId !== originalSchedule.hourId;
    const classroomChanged =
      data.classroomId !== undefined &&
      data.classroomId !== originalSchedule.classroomId;

    let teachingLoad: any = null;

    // 3. Ejecutar validaciones correspondientes
    if (teachingLoadChanged) {
      teachingLoad = await client.teachingLoad.findUnique({
        where: { id: merged.teachingLoadId },
        select: {
          id: true,
          staffTeachingProfileId: true,
          classId: true,
          classes: {
            select: {
              schoolYearId: true,
              semiannualPeriodId: true,
            },
          },
          staff_teaching_profile: {
            select: {
              isClassroomTeacher: true,
              staff: {
                select: {
                  staff_status: {
                    select: { isActive: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!teachingLoad) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Actualización de horario denegada: La carga académica con ID ${merged.teachingLoadId} no existe.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (!teachingLoad.staff_teaching_profile?.staff?.staff_status?.isActive) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Actualización de horario denegada: El docente asociado a la carga académica no se encuentra activo.',
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (!teachingLoad.staff_teaching_profile?.isClassroomTeacher) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message:
              'Actualización de horario denegada: El docente asociado a la carga académica no está configurado para impartir clases frente a grupo.',
            errorCode: 'CONFLICT',
          }),
        );
      }
    } else {
      // Necesitamos los IDs de la carga actual para validar choques
      teachingLoad = await client.teachingLoad.findUnique({
        where: { id: merged.teachingLoadId },
        select: {
          id: true,
          staffTeachingProfileId: true,
          classId: true,
          classes: {
            select: {
              schoolYearId: true,
              semiannualPeriodId: true,
            },
          },
        },
      });
    }

    if (!teachingLoad) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `Actualización de horario denegada: La carga académica con ID ${merged.teachingLoadId} no existe.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // Validar existencia de catálogos si cambiaron
    if (dayChanged || hourChanged || classroomChanged) {
      const [weekdayExists, weeklyHourExists, classroomExists] =
        await Promise.all([
          dayChanged
            ? client.weekDay.findUnique({ where: { id: merged.dayId } })
            : Promise.resolve(true),
          hourChanged
            ? client.weeklyHour.findUnique({ where: { id: merged.hourId } })
            : Promise.resolve(true),
          classroomChanged
            ? client.classroom.findUnique({ where: { id: merged.classroomId } })
            : Promise.resolve(true),
        ]);

      if (!weekdayExists) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Actualización de horario denegada: El día con ID ${merged.dayId} no existe.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (!weeklyHourExists) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Actualización de horario denegada: La hora/módulo con ID ${merged.hourId} no existe.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      if (!classroomExists) {
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Actualización de horario denegada: El aula con ID ${merged.classroomId} no existe.`,
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // Validar choques de horario si algo cambió
    if (dayChanged || hourChanged || classroomChanged || teachingLoadChanged) {
      // Choque de Docente (Mismo Año y Periodo Semestral)
      const teacherClash = await client.teachingLoadSchedule.findFirst({
        where: {
          dayId: merged.dayId,
          hourId: merged.hourId,
          teaching_load: {
            staffTeachingProfileId: teachingLoad.staffTeachingProfileId,
            classes: {
              schoolYearId: teachingLoad.classes.schoolYearId,
              semiannualPeriodId: teachingLoad.classes.semiannualPeriodId,
            },
          },
          NOT: { id },
        },
        select: {
          id: true,
          teaching_load: {
            select: {
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
          },
        },
      });

      if (teacherClash) {
        const person =
          teacherClash.teaching_load?.staff_teaching_profile?.staff?.persons;
        const teacherName = person
          ? `${person.firstName} ${person.firstLastName}`.trim()
          : `Docente ID ${teachingLoad.staffTeachingProfileId}`;
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Conflicto de horario: El docente "${teacherName}" ya tiene programada una clase en el día y hora seleccionados.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      // Choque de Aula (Mismo Año y Periodo Semestral)
      const classroomClash = await client.teachingLoadSchedule.findFirst({
        where: {
          dayId: merged.dayId,
          hourId: merged.hourId,
          classroomId: merged.classroomId,
          teaching_load: {
            classes: {
              schoolYearId: teachingLoad.classes.schoolYearId,
              semiannualPeriodId: teachingLoad.classes.semiannualPeriodId,
            },
          },
          NOT: { id },
        },
        select: {
          id: true,
          classrooms: {
            select: { name: true },
          },
        },
      });

      if (classroomClash) {
        const classroomName =
          classroomClash.classrooms?.name ?? `Aula ID ${merged.classroomId}`;
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Conflicto de horario: El aula "${classroomName}" ya está ocupada en el día y hora seleccionados.`,
            errorCode: 'CONFLICT',
          }),
        );
      }

      // Choque de Grupo/Clase (Mismo Grupo)
      const classClash = await client.teachingLoadSchedule.findFirst({
        where: {
          dayId: merged.dayId,
          hourId: merged.hourId,
          teaching_load: {
            classId: teachingLoad.classId,
          },
          NOT: { id },
        },
        select: {
          id: true,
          teaching_load: {
            select: {
              classes: {
                select: { classCode: true },
              },
            },
          },
        },
      });

      if (classClash) {
        const classCode =
          classClash.teaching_load?.classes?.classCode ??
          `Clase ID ${teachingLoad.classId}`;
        throw new ConflictException(
          qwikMessageResponse({
            success: false,
            message: `Conflicto de horario: El grupo "${classCode}" ya tiene otra materia programada en el día y hora seleccionados.`,
            errorCode: 'CONFLICT',
          }),
        );
      }
    }

    // 4. Preparar actualización transformando las relaciones para Prisma 7
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_teaching_load_schedule_updated_byTousers: {
        connect: { id: userId },
      },
    } as unknown as Prisma.TeachingLoadScheduleUpdateInput;

    // 5. Ejecutar actualización
    return await httpRequestUpdate<typeof dataToUpdate, T>({
      serviceName: TeachingLoadScheduleService.name,
      model: client.teachingLoadSchedule,
      logger: this.logger,
      idValue: id,
      data: dataToUpdate,
      returnData,
    });
  }

  async bulkCreate<T>(
    params: CreateEntityParams<BulkCreateTeachingLoadScheduleDto>,
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
          message: 'No se enviaron elementos para programar los horarios.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    this.logger.info(
      {
        count: items.length,
        createdBy: userId,
      },
      'Iniciando registro de horarios de carga académica en lote',
    );

    // 1. Extraer IDs únicos para consultas consolidadas
    const teachingLoadIds = Array.from(new Set(items.map((it) => it.teachingLoadId)));
    const dayIds = Array.from(new Set(items.map((it) => it.dayId)));
    const hourIds = Array.from(new Set(items.map((it) => it.hourId)));
    const classroomIds = Array.from(new Set(items.map((it) => it.classroomId)));

    // 2. Ejecutar validaciones e inserciones en una sola transacción atómica
    const createdSchedules = await this.prisma.$transaction(async (tx) => {
      // Consultas de existencia y propiedades básicas
      const [loads, days, hours, classrooms] = await Promise.all([
        tx.teachingLoad.findMany({
          where: { id: { in: teachingLoadIds } },
          select: {
            id: true,
            staffTeachingProfileId: true,
            classId: true,
            classes: {
              select: {
                schoolYearId: true,
                semiannualPeriodId: true,
                classCode: true,
              },
            },
            study_plans: {
              select: {
                subjectName: true,
              },
            },
            staff_teaching_profile: {
              select: {
                isClassroomTeacher: true,
                staff: {
                  select: {
                    titleKey: true,
                    persons: {
                      select: { curp: true, firstName: true, firstLastName: true },
                    },
                    staff_status: {
                      select: { isActive: true },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.weekDay.findMany({ where: { id: { in: dayIds } } }),
        tx.weeklyHour.findMany({ where: { id: { in: hourIds } } }),
        tx.classroom.findMany({ where: { id: { in: classroomIds } } }),
      ]);

      const loadMap = new Map(loads.map((l) => [l.id, l]));
      const dayMap = new Map(days.map((d) => [d.id, d]));
      const hourMap = new Map(hours.map((h) => [h.id, h]));
      const classroomMap = new Map(classrooms.map((c) => [c.id, c]));

      // Extraer parámetros específicos para la búsqueda de choques
      const teacherIds = loads.map(l => l.staffTeachingProfileId);
      const schoolYearIds = loads.map(l => l.classes.schoolYearId);
      const semiannualPeriodIds = loads.map(l => l.classes.semiannualPeriodId);
      const classIds = loads.map(l => l.classId);

      // Consultas consolidadas de choques de horario
      const [teacherClashes, classroomClashes, classClashes] = await Promise.all([
        tx.teachingLoadSchedule.findMany({
          where: {
            dayId: { in: dayIds },
            hourId: { in: hourIds },
            teaching_load: {
              staffTeachingProfileId: { in: teacherIds },
              classes: {
                schoolYearId: { in: schoolYearIds },
                semiannualPeriodId: { in: semiannualPeriodIds },
              },
            },
          },
          select: {
            id: true,
            dayId: true,
            hourId: true,
            teaching_load: {
              select: {
                staffTeachingProfileId: true,
                classes: {
                  select: { schoolYearId: true, semiannualPeriodId: true },
                },
                staff_teaching_profile: {
                  select: {
                    staff: {
                      select: {
                        persons: { select: { firstName: true, firstLastName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.teachingLoadSchedule.findMany({
          where: {
            dayId: { in: dayIds },
            hourId: { in: hourIds },
            classroomId: { in: classroomIds },
            teaching_load: {
              classes: {
                schoolYearId: { in: schoolYearIds },
                semiannualPeriodId: { in: semiannualPeriodIds },
              },
            },
          },
          select: {
            id: true,
            dayId: true,
            hourId: true,
            classroomId: true,
            classrooms: { select: { name: true } },
            teaching_load: {
              select: {
                classes: {
                  select: { schoolYearId: true, semiannualPeriodId: true },
                },
              },
            },
          },
        }),
        tx.teachingLoadSchedule.findMany({
          where: {
            dayId: { in: dayIds },
            hourId: { in: hourIds },
            teaching_load: {
              classId: { in: classIds },
            },
          },
          select: {
            id: true,
            dayId: true,
            hourId: true,
            teaching_load: {
              select: {
                classId: true,
                classes: { select: { classCode: true } },
              },
            },
          },
        }),
      ]);

      // Sets para rastreo de choques intra-lote (en memoria)
      const batchTeacherKeys = new Set<string>();
      const batchClassroomKeys = new Set<string>();
      const batchClassKeys = new Set<string>();

      // 3. Validaciones en memoria
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prefixMsg = `Fila ${i + 1}: `;

        // A. Validar existencia y estado de la Carga Académica
        const load = loadMap.get(item.teachingLoadId);
        if (!load) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La carga académica con ID ${item.teachingLoadId} no existe.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        if (!load.staff_teaching_profile?.staff?.staff_status?.isActive) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El docente asociado a la carga académica no se encuentra activo.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        if (!load.staff_teaching_profile?.isClassroomTeacher) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El docente asociado a la carga académica no está configurado para impartir clases frente a grupo.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        // B. Validar existencia física de catálogos
        const day = dayMap.get(item.dayId);
        if (!day) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El día con ID ${item.dayId} no existe.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        const hour = hourMap.get(item.hourId);
        if (!hour) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}La hora/módulo con ID ${item.hourId} no existe.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        const classroom = classroomMap.get(item.classroomId);
        if (!classroom) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}El aula con ID ${item.classroomId} no existe.`,
              errorCode: 'CONFLICT',
            }),
          );
        }

        const yearId = load.classes.schoolYearId;
        const periodId = load.classes.semiannualPeriodId;

        // C. Validar choques del Docente (Base de Datos e Intra-lote)
        const teacherKey = `${load.staffTeachingProfileId}-${item.dayId}-${item.hourId}-${yearId}-${periodId}`;
        const hasDbTeacherClash = teacherClashes.some(
          c =>
            c.dayId === item.dayId &&
            c.hourId === item.hourId &&
            c.teaching_load.staffTeachingProfileId === load.staffTeachingProfileId &&
            c.teaching_load.classes.schoolYearId === yearId &&
            c.teaching_load.classes.semiannualPeriodId === periodId,
        );

        if (hasDbTeacherClash || batchTeacherKeys.has(teacherKey)) {
          const person = load.staff_teaching_profile?.staff?.persons;
          const teacherName = person
            ? `${person.firstName} ${person.firstLastName}`.trim()
            : `Docente ID ${load.staffTeachingProfileId}`;
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}Conflicto de horario: El docente "${teacherName}" ya tiene programada una clase en el día y hora seleccionados.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        batchTeacherKeys.add(teacherKey);

        // D. Validar choques de Aula (Base de Datos e Intra-lote)
        const classroomKey = `${item.classroomId}-${item.dayId}-${item.hourId}-${yearId}-${periodId}`;
        const hasDbClassroomClash = classroomClashes.some(
          c =>
            c.dayId === item.dayId &&
            c.hourId === item.hourId &&
            c.classroomId === item.classroomId &&
            c.teaching_load.classes.schoolYearId === yearId &&
            c.teaching_load.classes.semiannualPeriodId === periodId,
        );

        if (hasDbClassroomClash || batchClassroomKeys.has(classroomKey)) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}Conflicto de horario: El aula "${classroom.name}" ya está ocupada en el día y hora seleccionados.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        batchClassroomKeys.add(classroomKey);

        // E. Validar choques de Grupo/Clase (Base de Datos e Intra-lote)
        const classKey = `${load.classId}-${item.dayId}-${item.hourId}`;
        const hasDbClassClash = classClashes.some(
          c =>
            c.dayId === item.dayId &&
            c.hourId === item.hourId &&
            c.teaching_load.classId === load.classId,
        );

        if (hasDbClassClash || batchClassKeys.has(classKey)) {
          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: `${prefixMsg}Conflicto de horario: El grupo "${load.classes.classCode}" ya tiene otra materia programada en el día y hora seleccionados.`,
              errorCode: 'CONFLICT',
            }),
          );
        }
        batchClassKeys.add(classKey);
      }

      // 4. Inserciones atómicas
      const records: any[] = [];
      for (const item of items) {
        // Formatear relaciones para Prisma 7
        const relationalData = transformRelationIds({
          teachingLoadId: item.teachingLoadId,
          dayId: item.dayId,
          hourId: item.hourId,
          classroomId: item.classroomId,
        });

        const dtoToSave = {
          ...relationalData,
          users_teaching_load_schedule_created_byTousers: {
            connect: { id: userId },
          },
          users_teaching_load_schedule_updated_byTousers: {
            connect: { id: userId },
          },
        } as unknown as Prisma.TeachingLoadScheduleCreateInput;

        const created = await tx.teachingLoadSchedule.create({
          data: dtoToSave,
        });
        records.push(created);
      }
      return records;
    }, {
      timeout: 20000,
    });

    return {
      success: true,
      status: 'success',
      statusCode: 201,
      message: `Se registraron exitosamente ${createdSchedules.length} horarios de carga académica.`,
      data: createdSchedules as unknown as T[],
    };
  }
}
