import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { httpRequestFindMany } from '@/common/helpers';
import { ApiResponse } from '@/common/interfaces';
import { PrismaService } from '@/prisma';
import { QueryMunicipalityDto, QueryStudyPlanDto, QueryTeacherDto } from './dto';

@Injectable()
export class CatalogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CatalogsService.name);
  }

  /* ============================================================
     📋 GET ALL ROLES
     ------------------------------------------------------------
     📌 Devuelve todos los roles del sistema ordenados por nombre.
     ============================================================ */
  async getRoles<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.RoleFindManyArgs = {
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.role,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL USER TYPES
     ------------------------------------------------------------
     📌 Devuelve todos los tipos de usuario ordenados por nombre.
     ============================================================ */
  async getUserTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.UserTypeFindManyArgs = {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.userType,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL STREET TYPES
     ------------------------------------------------------------
     📌 Devuelve todos los tipos de vialidad ordenados por nombre.
     ============================================================ */
  async getStreetTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.StreetTypeFindManyArgs = {
      select: {
        id: true,
        name: true,
        abbreviation: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.streetType,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL SETTLEMENT TYPES
     ------------------------------------------------------------
     📌 Devuelve todos los tipos de asentamiento ordenados por nombre.
     ============================================================ */
  async getSettlementTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.SettlementTypeFindManyArgs = {
      select: {
        id: true,
        settlementType: true,
        abbreviation: true,
      },
      orderBy: {
        settlementType: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.settlementType,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET SETTLEMENTS BY ZIP CODE
     ------------------------------------------------------------
     📌 Devuelve los asentamientos (colonias) asociados a un CP,
        usando la vista 'viewZipCode' para optimizar la consulta.
     ============================================================ */
  async getSettlementsByZipCode<T>(zipCode: string): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ViewZipCodeFindManyArgs = {
      select: {
        id: true,
        zipCode: true,
        settlement: true,
        settlementType: true,
        abbreviation: true,
        locality: true,
        zoneType: true,
        municipality: true,
        municipalityId: true,
        stateId: true,
        stateName: true,
      },
      where: {
        zipCode: zipCode.trim(),
      },
      orderBy: {
        settlement: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.viewZipCode,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL STATES
     ------------------------------------------------------------
     📌 Devuelve todos los estados de la República Mexicana.
     ============================================================ */
  async getStates<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.StateFindManyArgs = {
      select: {
        id: true,
        code: true,
        inegiCode: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.state,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL MUNICIPALITIES WITH FILTERS
     ------------------------------------------------------------
     📌 Devuelve municipios ordenados por nombre. Soporta filtros 
     por ID de estado (stateId), código de estado (stateCode) y
     búsqueda parcial (searchTerm).
     ============================================================ */
  async getMunicipalities<T>(
    filters: QueryMunicipalityDto,
  ): Promise<ApiResponse<T[]>> {
    const { stateId, stateCode, searchTerm } = filters;

    // 🔹 Construcción del WHERE dinámico
    const where: Prisma.MunicipalityWhereInput = {};

    if (stateId) {
      where.stateId = stateId;
    } else if (stateCode) {
      where.states = {
        code: stateCode.toUpperCase(),
      };
    }

    if (searchTerm) {
      where.municipality = {
        contains: searchTerm,
      };
    }

    const queryOptions: Prisma.MunicipalityFindManyArgs = {
      select: {
        id: true,
        code: true,
        inegiNumber: true,
        municipality: true,
        municipalCapital: true,
        stateId: true,
      },
      where,
      orderBy: {
        municipality: 'asc',
      },
      // 💡 Si no se especifica estado y solo es una búsqueda por texto,
      // limitamos a 50 resultados para optimizar desempeño.
      ...(!stateId && !stateCode && searchTerm && { take: 50 }),
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.municipality,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL MARITAL STATUSES
     ------------------------------------------------------------
     📌 Devuelve todos los estados civiles ordenados por estado.
     ============================================================ */
  async getMaritalStatuses<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.MaritalStatusFindManyArgs = {
      select: {
        id: true,
        status: true,
      },
      orderBy: {
        status: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.maritalStatus,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL CONTACT RELATIONSHIPS (PARENTESCOS)
     ------------------------------------------------------------
     📌 Devuelve todos los parentescos ordenados alfabéticamente.
     ============================================================ */
  async getContactRelationships<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ContactRelationshipFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.contactRelationship,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL INDIGENOUS LANGUAGES
     ------------------------------------------------------------
     📌 Devuelve todas las lenguas indígenas ordenadas por nombre.
     ============================================================ */
  async getIndigenousLanguages<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.IndigenousLanguageFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.indigenousLanguage,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL FOREIGN LANGUAGES
     ------------------------------------------------------------
     📌 Devuelve todas las lenguas extranjeras ordenadas por nombre.
     ============================================================ */
  async getForeignLanguages<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ForeignLanguageFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.foreignLanguage,
      logger: this.logger,
      queryOptions,
    });
  }

  /* ============================================================
     📋 GET ALL SPECIAL CONDITIONS
     ------------------------------------------------------------
     📌 Devuelve todas las condiciones especiales ordenadas por nombre.
     ============================================================ */
  async getSpecialConditions<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.SpecialConditionFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.specialCondition,
      logger: this.logger,
      queryOptions,
    });
  }

  async getEducationalPrograms<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.EducationalProgramFindManyArgs = {
      select: {
        id: true,
        code: true,
        name: true,
        studyPlan: true,
        academic_disciplines: {
          select: {
            school_offered_levels: {
              select: {
                offeredEducationLevel: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.educationalProgram,
      logger: this.logger,
      queryOptions,
    });
  }

  async getSchoolYears<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.SchoolYearFindManyArgs = {
      select: {
        id: true,
        schoolYear: true,
      },
      orderBy: {
        schoolYear: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.schoolYear,
      logger: this.logger,
      queryOptions,
    });
  }

  async getSemesters<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.SemesterFindManyArgs = {
      select: {
        id: true,
        number: true,
        ordinalNumber: true,
      },
      orderBy: {
        number: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.semester,
      logger: this.logger,
      queryOptions,
    });
  }

  async getSemiannualPeriods<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.SemiannualPeriodFindManyArgs = {
      select: {
        id: true,
        semiannualPeriod: true,
        periodType: true,
      },
      orderBy: {
        id: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.semiannualPeriod,
      logger: this.logger,
      queryOptions,
    });
  }

  async getTitles<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.TitleFindManyArgs = {
      select: {
        id: true,
        key: true,
      },
      orderBy: {
        key: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.title,
      logger: this.logger,
      queryOptions,
    });
  }

  async getStaffTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.StaffTypeFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.staffType,
      logger: this.logger,
      queryOptions,
    });
  }

  async getEmploymentTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.EmploymentTypeFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.employmentType,
      logger: this.logger,
      queryOptions,
    });
  }

  async getEmploymentDurations<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.EmploymentDurationFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.employmentDuration,
      logger: this.logger,
      queryOptions,
    });
  }

  async getResponsibilities<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ResponsibilityFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.responsibility,
      logger: this.logger,
      queryOptions,
    });
  }

  async getCategories<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.CategoryFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.category,
      logger: this.logger,
      queryOptions,
    });
  }

  async getEducationLevels<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.EducationLevelFindManyArgs = {
      select: {
        id: true,
        level: true,
      },
      orderBy: {
        level: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.educationLevel,
      logger: this.logger,
      queryOptions,
    });
  }

  async getKnowledgeAreas<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.KnowledgeAreaFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.knowledgeArea,
      logger: this.logger,
      queryOptions,
    });
  }

  async getDisciplines<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.DisciplineFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.discipline,
      logger: this.logger,
      queryOptions,
    });
  }

  async getAcademicDisciplines<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.AcademicDisciplineFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.academicDiscipline,
      logger: this.logger,
      queryOptions,
    });
  }

  async getStudentGenerations<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.StudentGenerationFindManyArgs = {
      select: {
        id: true,
        generationName: true,
        mastersDegreeCycle: true,
        bachelorDegreeCycle: true,
      },
      orderBy: {
        generationName: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.studentGeneration,
      logger: this.logger,
      queryOptions,
    });
  }

  async getStudentStatuses<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.StudentStatusFindManyArgs = {
      select: {
        id: true,
        statusKey: true,
        description: true,
      },
      orderBy: {
        description: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.studentStatus,
      logger: this.logger,
      queryOptions,
    });
  }

  async getStudyPlans<T>(
    filters: QueryStudyPlanDto,
  ): Promise<ApiResponse<T[]>> {
    let { educationalProgramId, semesterId } = filters;

    if (filters.classCode) {
      const classData = await this.prisma.class.findFirst({
        where: { classCode: filters.classCode },
        select: { educationalProgramId: true, semesterId: true },
      });
      if (!classData) {
        throw new NotFoundException(
          `No se encontró la clase con el código: ${filters.classCode}`,
        );
      }
      educationalProgramId = classData.educationalProgramId;
      semesterId = classData.semesterId;
    }

    const where: Prisma.StudyPlanWhereInput = {};

    if (educationalProgramId) {
      where.educationalProgramId = educationalProgramId;
    }
    if (semesterId) {
      where.semesterId = semesterId;
    }

    const queryOptions: Prisma.StudyPlanFindManyArgs = {
      select: {
        id: true,
        subjectKey: true,
        subjectName: true,
        displayOrder: true,
      },
      where,
      orderBy: {
        displayOrder: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.studyPlan,
      logger: this.logger,
      queryOptions,
    });
  }

  async getWeekDays<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.WeekDayFindManyArgs = {
      select: {
        id: true,
        dayKey: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.weekDay,
      logger: this.logger,
      queryOptions,
    });
  }

  async getWeeklyHours<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.WeeklyHourFindManyArgs = {
      select: {
        id: true,
        hour_key: true,
        hour_type: true,
      },
      orderBy: {
        id: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.weeklyHour,
      logger: this.logger,
      queryOptions,
    });
  }

  async getClassrooms<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ClassroomFindManyArgs = {
      select: {
        id: true,
        name: true,
        classroomKey: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.classroom,
      logger: this.logger,
      queryOptions,
    });
  }

  async getClasses<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.ClassFindManyArgs = {
      select: {
        id: true,
        classCode: true,
      },
      orderBy: {
        classCode: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.class,
      logger: this.logger,
      queryOptions,
    });
  }

  async getTeachers<T>(filters: QueryTeacherDto): Promise<ApiResponse<T[]>> {
    const where: Prisma.TeachingLoadWhereInput = {};
    
    if (filters.schoolYearId || filters.semesterId || filters.semiannualPeriodId) {
      where.classes = {};
      if (filters.schoolYearId) {
        where.classes.schoolYearId = filters.schoolYearId;
      }
      if (filters.semesterId) {
        where.classes.semesterId = filters.semesterId;
      }
      if (filters.semiannualPeriodId) {
        where.classes.semiannualPeriodId = filters.semiannualPeriodId;
      }
    }

    let profileIds: number[] | undefined;
    if (Object.keys(where).length > 0) {
      const activeLoads = await this.prisma.teachingLoad.findMany({
        where,
        select: {
          staffTeachingProfileId: true,
        },
      });
      profileIds = Array.from(new Set(activeLoads.map(l => l.staffTeachingProfileId)));
    }

    // Filtrar para obtener solo personal activo
    const activeStaff = await this.prisma.staff.findMany({
      where: {
        staff_status: {
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });
    const activeStaffIds = activeStaff.map(s => s.id);

    const profileWhere: Prisma.ViewStaffTeachingProfileWhereInput = {
      isClassroomTeacher: true,
      staffId: { in: activeStaffIds },
    };

    if (profileIds !== undefined) {
      profileWhere.id = { in: profileIds };
    }

    const queryOptions: Prisma.ViewStaffTeachingProfileFindManyArgs = {
      select: {
        id: true,
        fullName: true,
        titleKey: true,
      },
      where: profileWhere,
      orderBy: {
        fullName: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.viewStaffTeachingProfile,
      logger: this.logger,
      queryOptions,
    });
  }

  async getDocumentTypes<T>(): Promise<ApiResponse<T[]>> {
    const queryOptions: Prisma.DocumentTypeFindManyArgs = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    return await httpRequestFindMany<T>({
      serviceName: CatalogsService.name,
      model: this.prisma.documentType,
      logger: this.logger,
      queryOptions,
    });
  }
}
