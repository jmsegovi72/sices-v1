import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
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
import { PrismaService } from '@/prisma';
import {
  ChangeStaffStatusDto,
  CreateStaffDto,
  CreateStaffTeachingProfileDto,
  QueryStaffDto,
  QueryStaffTeachingProfileDto,
  UpdateStaffAcademicProfileDto,
  UpdateStaffDto,
  UpdateStaffTeachingProfileDto,
} from './dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
    👔 CREATE STAFF (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Da de alta a una persona como personal de la escuela.
    - Transacción atómica: staff + staff_academic_profile
    - PRE-CHECK 1: Persona existe
    - PRE-CHECK 2: Persona no es alumno activo
    - PRE-CHECK 3: Catálogos válidos
    - PRE-CHECK 4: Candado de contrato único (no repetir el mismo contrato/función)
    ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateStaffDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { personId: data.personId, createdBy: userId },
      'Iniciando alta de personal',
    );

    // 🔹 PRE-CHECKS (fuera de transacción — solo lectura)

    // PRE-CHECK 1: Persona existe
    const person = await client.person.findUnique({
      where: { id: data.personId },
      select: { id: true },
    });
    if (!person) {
      throw new BadRequestException(
        `La persona con ID ${data.personId} no existe.`,
      );
    }

    // PRE-CHECK 2: Persona no es alumno activo
    const activeStudent = await client.student.findFirst({
      where: {
        personId: data.personId,
        student_status: {
          isActive: true,
        },
      },
      select: { id: true },
    });
    if (activeStudent) {
      throw new BadRequestException(
        'La persona no puede registrarse como personal porque es un alumno activo.',
      );
    }

    // PRE-CHECK 3: Validar que los catálogos existan
    const [
      title,
      staffType,
      employmentType,
      employmentDuration,
      responsibility,
      category,
      educationLevel,
      knowledgeArea,
      discipline,
    ] = await Promise.all([
      client.title.findUnique({
        where: { key: data.titleKey },
        select: { id: true },
      }),
      client.staffType.findUnique({
        where: { id: data.staffTypeId },
        select: { id: true },
      }),
      client.employmentType.findUnique({
        where: { id: data.employmentTypeId },
        select: { id: true },
      }),
      client.employmentDuration.findUnique({
        where: { id: data.employmentDurationId },
        select: { id: true },
      }),
      client.responsibility.findUnique({
        where: { id: data.responsibilityId },
        select: { id: true },
      }),
      client.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      }),
      client.educationLevel.findUnique({
        where: { id: data.educationLevelId },
        select: { id: true },
      }),
      client.knowledgeArea.findUnique({
        where: { id: data.knowledgeAreaId ?? 1 },
        select: { id: true },
      }),
      client.discipline.findUnique({
        where: { id: data.disciplineId ?? 1 },
        select: { id: true },
      }),
    ]);

    if (!title)
      throw new BadRequestException(
        `El tratamiento con clave '${data.titleKey}' no existe.`,
      );
    if (!staffType)
      throw new BadRequestException(
        `El tipo de personal con ID ${data.staffTypeId} no existe.`,
      );
    if (!employmentType)
      throw new BadRequestException(
        `El tipo de empleo con ID ${data.employmentTypeId} no existe.`,
      );
    if (!employmentDuration)
      throw new BadRequestException(
        `La duración de empleo con ID ${data.employmentDurationId} no existe.`,
      );
    if (!responsibility)
      throw new BadRequestException(
        `La responsabilidad con ID ${data.responsibilityId} no existe.`,
      );
    if (!category)
      throw new BadRequestException(
        `La categoría con ID ${data.categoryId} no existe.`,
      );
    if (!educationLevel)
      throw new BadRequestException(
        `El nivel educativo con ID ${data.educationLevelId} no existe.`,
      );
    if (!knowledgeArea)
      throw new BadRequestException(
        `El área de conocimiento con ID ${data.knowledgeAreaId ?? 1} no existe.`,
      );
    if (!discipline)
      throw new BadRequestException(
        `La disciplina con ID ${data.disciplineId ?? 1} no existe.`,
      );

    if (data.schoolOfOriginId) {
      const schoolOfOrigin = await client.schoolOfOrigin.findUnique({
        where: { id: data.schoolOfOriginId },
        select: { id: true },
      });
      if (!schoolOfOrigin) {
        throw new BadRequestException(
          `La escuela de origen con ID ${data.schoolOfOriginId} no existe.`,
        );
      }
    }

    // PRE-CHECK 4: Persona no tiene ya el mismo contrato (El candado)
    const existingContract = await client.staff.findFirst({
      where: {
        personId: data.personId,
        staffTypeId: data.staffTypeId,
        employmentTypeId: data.employmentTypeId,
        employmentDurationId: data.employmentDurationId,
        responsibilityId: data.responsibilityId,
        categoryId: data.categoryId,
      },
      select: { id: true },
    });
    if (existingContract) {
      throw new BadRequestException(
        'Este personal ya tiene registrado un contrato con las mismas características.',
      );
    }

    // 🔹 Escribir registros en transacción
    const executeWrite = async (txClient: any) => {
      // 1. Crear registro de Staff
      const newStaff = await txClient.staff.create({
        data: {
          personId: data.personId,
          titleKey: data.titleKey,
          staffTypeId: data.staffTypeId,
          employmentTypeId: data.employmentTypeId,
          employmentDurationId: data.employmentDurationId,
          responsibilityId: data.responsibilityId,
          categoryId: data.categoryId,
          staffStatusId: data.staffStatusId ?? 1,
          systemEntryDate: data.systemEntryDate,
          schoolEntryDate: data.schoolEntryDate,
          institutionalMail: data.institutionalMail ?? null,
          paymentUniqueKey: data.paymentUniqueKey ?? 'No especificado',
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // 2. Crear registro de Perfil Académico
      await txClient.staffAcademicProfile.create({
        data: {
          staffId: newStaff.id,
          educationLevelId: data.educationLevelId,
          isGraduate: data.isGraduate ?? false,
          graduationDate: data.graduationDate ?? null,
          schoolOfOriginId: data.schoolOfOriginId ?? null,
          knowledgeAreaId: data.knowledgeAreaId ?? 1,
          disciplineId: data.disciplineId ?? 1,
          sniLevel: data.sniLevel ?? 'No aplica',
          researchProject: data.researchProject ?? 'Ninguno',
          thesisTopic: data.thesisTopic ?? 'Ninguno',
          hasDoneStay: data.hasDoneStay ?? false,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return newStaff;
    };

    const staffCreated = params.options?.tx
      ? await executeWrite(params.options.tx)
      : await this.prisma.$transaction(async (tx) => await executeWrite(tx));

    this.logger.info(
      { staffId: staffCreated.id },
      'Alta de personal completada con éxito',
    );

    const responseData = returnData
      ? (staffCreated as unknown as T)
      : undefined;
    return qwikMessageResponse<T>({
      success: true,
      message: 'El personal ha sido dado de alta correctamente.',
      data: responseData,
    });
  }

  /* ============================================================
  📋 FIND MANY STAFF (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Obtiene un listado de personal desde la vista 'ViewStaffComplete'
  con paginación segura y filtrado dinámico.
  ============================================================ */
  async findMany<T>(filters: QueryStaffDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Resolver paginación
    const pagination = resolvePagination(filters);

    // 🔹 2. Construir filtros dinámicos (WHERE)
    const whereCondition = buildWhereMany<
      Prisma.ViewStaffCompleteWhereInput,
      QueryStaffDto
    >(filters, {
      searchTermMode: true,
      equals: {
        isActive: 'isActive',
        curp: 'curp',
        isGraduate: 'isGraduate',
        hasDoneStay: 'hasDoneStay',
        staffType: 'staffType',
        employmentType: 'employmentType',
        employmentDuration: 'employmentDuration',
        responsibility: 'responsibility',
        sniLevel: 'sniLevel',
      },
      contains: {
        fullName: 'fullName',
        institutionalMail: 'institutionalMail',
        category: 'category',
        educationLevel: 'educationLevel',
      },
      orSearch: [
        'fullName',
        'curp',
        'institutionalMail',
        'category',
        'staffType',
        'employmentType',
      ],
    });

    // 🔹 3. Opciones de consulta
    const queryOptions: Prisma.ViewStaffCompleteFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    };

    // 🔹 4. Ejecutar consulta centralizada
    return await httpRequestFindMany<T>({
      serviceName: StaffService.name,
      model: this.prisma.viewStaffComplete,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
  📋 FIND ALL STAFF (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Obtiene el listado completo y ordenado de todo el personal 
  desde la vista 'ViewStaffComplete' con paginación.
  ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Extraer paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewStaffCompleteFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    };

    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: StaffService.name,
      model: this.prisma.viewStaffComplete,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
  🔍 FIND ONE STAFF BY CRITERIA (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Busca un personal en la vista 'ViewStaffComplete' utilizando
  detección automática del SearchDto.
  - Búsqueda únicamente por staffId (el id de la tabla staff/vista)
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

    // 🔹 3. Mapeo dinámico (solo 'id' es único)
    const fieldMaps: TypeWhereFieldMap[] = [{ type: 'id', field: 'id' }];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.staff : client.viewStaffComplete;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        personId: true,
        titleKey: true,
        staffTypeId: true,
        employmentTypeId: true,
        employmentDurationId: true,
        responsibilityId: true,
        categoryId: true,
        staffStatusId: true,
        systemEntryDate: true,
        schoolEntryDate: true,
        institutionalMail: true,
        paymentUniqueKey: true,
        persons: {
          select: {
            curp: true,
            firstName: true,
            firstLastName: true,
            secondLastName: true,
            fullName: true,
            gender: true,
            birthDate: true,
          },
        },
        staff_type: {
          select: {
            name: true,
          },
        },
        employment_type: {
          select: {
            name: true,
          },
        },
        employment_duration: {
          select: {
            name: true,
          },
        },
        responsibilities: {
          select: {
            name: true,
          },
        },
        categories: {
          select: {
            name: true,
          },
        },
        staff_status: {
          select: {
            name: true,
            isActive: true,
          },
        },
        staff_academic_profile: {
          select: {
            educationLevelId: true,
            isGraduate: true,
            graduationDate: true,
            schoolOfOriginId: true,
            knowledgeAreaId: true,
            disciplineId: true,
            sniLevel: true,
            researchProject: true,
            thesisTopic: true,
            hasDoneStay: true,
            education_levels: {
              select: {
                name: true,
              },
            },
            schools_of_origin: {
              select: {
                schoolName: true,
                fundingSource: true,
              },
            },
            knowledge_areas: {
              select: {
                name: true,
              },
            },
            disciplines: {
              select: {
                name: true,
              },
            },
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const result = await httpRequestFindUnique<any>({
      serviceName: StaffService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const staff = result.data;
      const person = staff.persons ?? {};
      const academic = staff.staff_academic_profile ?? {};

      let employeeAge: number | null = null;
      if (person.birthDate) {
        const birth = new Date(person.birthDate);
        const ageDifMs = Date.now() - birth.getTime();
        const ageDate = new Date(ageDifMs);
        employeeAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      let systemYears: string = 'No especificado';
      if (staff.systemEntryDate) {
        const entry = new Date(staff.systemEntryDate);
        const diffMs = Date.now() - entry.getTime();
        const diffDate = new Date(diffMs);
        systemYears = String(Math.abs(diffDate.getUTCFullYear() - 1970));
      }

      let schoolYears: string = 'No especificado';
      if (staff.schoolEntryDate) {
        const entry = new Date(staff.schoolEntryDate);
        const diffMs = Date.now() - entry.getTime();
        const diffDate = new Date(diffMs);
        schoolYears = String(Math.abs(diffDate.getUTCFullYear() - 1970));
      }

      const formatDate = (date: Date | null | undefined, fallback = ''): string => {
        if (!date) return fallback;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      result.data = {
        id: staff.id,
        personId: staff.personId,
        titleKey: staff.titleKey,
        staffTypeId: staff.staffTypeId,
        employmentTypeId: staff.employmentTypeId,
        employmentDurationId: staff.employmentDurationId,
        responsibilityId: staff.responsibilityId,
        categoryId: staff.categoryId,
        staffStatusId: staff.staffStatusId,
        systemEntryDate: formatDate(staff.systemEntryDate, 'No especificado'),
        schoolEntryDate: formatDate(staff.schoolEntryDate, 'No especificado'),
        institutionalMail: staff.institutionalMail,
        paymentUniqueKey: staff.paymentUniqueKey,
        curp: person.curp ?? null,
        firstName: person.firstName ?? null,
        firstLastName: person.firstLastName ?? null,
        secondLastName: person.secondLastName ?? null,
        fullName: person.fullName ?? null,
        gender: person.gender ?? null,
        birthDate: person.birthDate ?? null,
        employeeAge,
        systemYears,
        schoolYears,
        staffType: staff.staff_type?.name ?? null,
        employmentType: staff.employment_type?.name ?? null,
        employmentDuration: staff.employment_duration?.name ?? null,
        responsibility: staff.responsibilities?.name ?? null,
        category: staff.categories?.name ?? null,
        staffStatus: staff.staff_status?.name ?? null,
        isActive: staff.staff_status?.isActive ?? null,
        educationLevelId: academic.educationLevelId ?? null,
        isGraduate: academic.isGraduate ?? null,
        graduationDate: formatDate(academic.graduationDate, ''),
        schoolOfOriginId: academic.schoolOfOriginId ?? null,
        knowledgeAreaId: academic.knowledgeAreaId ?? null,
        disciplineId: academic.disciplineId ?? null,
        sniLevel: academic.sniLevel ?? null,
        researchProject: academic.researchProject ?? null,
        thesisTopic: academic.thesisTopic ?? null,
        hasDoneStay: academic.hasDoneStay ?? null,
        educationLevel: academic.education_levels?.name ?? null,
        schoolOfOrigin: academic.schools_of_origin?.schoolName ?? null,
        fundingSource: academic.schools_of_origin?.fundingSource ?? null,
        knowledgeArea: academic.knowledge_areas?.name ?? null,
        discipline: academic.disciplines?.name ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
  ✏️ UPDATE STAFF (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Actualiza los datos del contrato general del personal.
  Valida la existencia de catálogos y el candado de contrato único.
  ============================================================ */
  async update<T>(
    params: UpdateEntityParams<UpdateStaffDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extraer parámetros
    const { userId, idValue, data, client, returnData } = extractUpdateParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validar que el personal existe
    const existingStaff = await client.staff.findUnique({
      where: { id: idValue as number },
      select: {
        id: true,
        personId: true,
        staffTypeId: true,
        employmentTypeId: true,
        employmentDurationId: true,
        responsibilityId: true,
        categoryId: true,
      },
    });
    if (!existingStaff) {
      throw new BadRequestException(`El personal con ID ${idValue} no existe.`);
    }

    // 🔹 3. Construir contrato mezclado
    const mergedContract = {
      staffTypeId: data.staffTypeId ?? existingStaff.staffTypeId,
      employmentTypeId: data.employmentTypeId ?? existingStaff.employmentTypeId,
      employmentDurationId:
        data.employmentDurationId ?? existingStaff.employmentDurationId,
      responsibilityId: data.responsibilityId ?? existingStaff.responsibilityId,
      categoryId: data.categoryId ?? existingStaff.categoryId,
    };

    // 🔹 4. Validar el candado de contrato único (excluyendo el staff actual)
    const isContractChanged =
      data.staffTypeId !== undefined ||
      data.employmentTypeId !== undefined ||
      data.employmentDurationId !== undefined ||
      data.responsibilityId !== undefined ||
      data.categoryId !== undefined;

    if (isContractChanged) {
      const duplicateContract = await client.staff.findFirst({
        where: {
          personId: existingStaff.personId,
          staffTypeId: mergedContract.staffTypeId,
          employmentTypeId: mergedContract.employmentTypeId,
          employmentDurationId: mergedContract.employmentDurationId,
          responsibilityId: mergedContract.responsibilityId,
          categoryId: mergedContract.categoryId,
          NOT: {
            id: existingStaff.id,
          },
        },
      });
      if (duplicateContract) {
        throw new BadRequestException(
          'Este personal ya tiene registrado otro contrato con las mismas características.',
        );
      }
    }

    // 🔹 5. Extraer updatedBy y transformar relaciones (Prisma 7 compatible)
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_staff_updated_byTousers: { connect: { id: userId } },
    };

    // 🔹 6. Ejecutar actualización
    const executeInactivation = async (txClient: any) => {
      const updateResult = await httpRequestUpdate<any, T>({
        serviceName: StaffService.name,
        model: txClient.staff,
        logger: this.logger,
        idValue,
        data: dataToUpdate,
        returnData,
      });

      if (data.staffStatusId) {
        await this.handleTeachingProfileInactivation(
          txClient,
          idValue as number,
          data.staffStatusId,
          userId,
        );
      }

      return updateResult;
    };

    if (client === this.prisma) {
      return await this.prisma.$transaction(executeInactivation);
    } else {
      return await executeInactivation(client);
    }
  }

  /* ============================================================
  ✏️ UPDATE STAFF ACADEMIC PROFILE (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Actualiza el perfil académico de un miembro del personal.
  Valida la existencia de los catálogos correspondientes.
  ============================================================ */
  async updateAcademicProfile<T>(
    params: UpdateEntityParams<UpdateStaffAcademicProfileDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extraer parámetros
    const { userId, idValue, data, client, returnData } = extractUpdateParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validar que el personal existe
    const existingStaff = await client.staff.findUnique({
      where: { id: idValue as number },
      select: { id: true },
    });
    if (!existingStaff) {
      throw new BadRequestException(`El personal con ID ${idValue} no existe.`);
    }

    // 🔹 3. Extraer updatedBy y transformar relaciones (Prisma 7 compatible)
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_staff_academic_profile_updated_byTousers: {
        connect: { id: userId },
      },
    };

    // 🔹 4. Ejecutar actualización filtrando por staffId (clave única)
    return await httpRequestUpdate<any, T>({
      serviceName: StaffService.name,
      model: client.staffAcademicProfile,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName: 'staffId',
    });
  }

  /* ============================================================
    👔 CREATE STAFF TEACHING PROFILE (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Registra el perfil docente (frente a grupo) para un personal.
    ============================================================ */
  async createTeachingProfile<T>(
    params: CreateEntityParams<CreateStaffTeachingProfileDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { staffId: data.staffId, createdBy: userId },
      'Iniciando registro de perfil docente',
    );

    // PRE-CHECK 1: El personal existe
    const staff = await client.staff.findUnique({
      where: { id: data.staffId },
      select: {
        id: true,
        staffTypeId: true,
        staff_status: { select: { isActive: true } },
      },
    });
    if (!staff) {
      throw new BadRequestException(
        `El personal con ID ${data.staffId} no existe.`,
      );
    }

    // PRE-CHECK 2: Validar tipo de personal autorizado para docencia
    // Se bloquea el tipo 6 ("Otros" - choferes, personal de limpieza, servicios generales)
    const ALLOWED_TEACHING_STAFF_TYPES = [1, 2, 3, 4, 5];
    if (!ALLOWED_TEACHING_STAFF_TYPES.includes(staff.staffTypeId)) {
      throw new BadRequestException(
        'No se puede registrar un perfil docente para este tipo de personal (por ejemplo: personal de limpieza, choferes o servicios generales).',
      );
    }

    // PRE-CHECK 3: Validar que no se intente activar frente a grupo si el personal está inactivo
    const isClassroomTeacherValue = data.isClassroomTeacher ?? true;
    if (isClassroomTeacherValue && !staff.staff_status?.isActive) {
      throw new BadRequestException(
        'No se puede registrar al personal como docente frente a grupo porque su estado actual de personal está inactivo.',
      );
    }

    // PRE-CHECK 4: No tiene ya perfil docente
    const existingProfile = await client.staffTeachingProfile.findUnique({
      where: { staffId: data.staffId },
      select: { id: true },
    });
    if (existingProfile) {
      throw new BadRequestException(
        `El personal con ID ${data.staffId} ya tiene un perfil docente registrado.`,
      );
    }

    // 🔹 Preparar datos (Prisma 7 compatible)
    const dataToCreate = {
      staffId: data.staffId,
      isClassroomTeacher: data.isClassroomTeacher ?? true,
      levelTaught: data.levelTaught ?? 'Licenciatura',
      users_staff_teaching_profile_created_byTousers: {
        connect: { id: userId },
      },
      users_staff_teaching_profile_updated_byTousers: {
        connect: { id: userId },
      },
    };

    return await httpRequestCreate<any, T>({
      serviceName: StaffService.name,
      methodName: 'createTeachingProfile',
      model: client.staffTeachingProfile,
      logger: this.logger,
      data: dataToCreate,
      returnData,
    });
  }

  /* ============================================================
    📋 FIND MANY TEACHING PROFILES (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Obtiene un listado de perfiles docentes desde la vista
    'ViewStaffTeachingProfile' con paginación y filtrado.
    ============================================================ */
  async findManyTeachingProfiles<T>(
    filters: QueryStaffTeachingProfileDto,
  ): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewStaffTeachingProfileWhereInput,
      QueryStaffTeachingProfileDto
    >(filters, {
      searchTermMode: true,
      equals: {
        isClassroomTeacher: 'isClassroomTeacher',
        curp: 'curp',
        staffId: 'staffId',
      },
      contains: {
        fullName: 'fullName',
        levelTaught: 'levelTaught',
      },
      orSearch: ['fullName', 'curp', 'levelTaught'],
    });

    const queryOptions: Prisma.ViewStaffTeachingProfileFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    };

    return await httpRequestFindMany<T>({
      serviceName: StaffService.name,
      model: this.prisma.viewStaffTeachingProfile,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
    📋 FIND ALL TEACHING PROFILES (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Obtiene el listado completo y paginado de todos los perfiles
    docentes desde la vista 'ViewStaffTeachingProfile'.
    ============================================================ */
  async findAllTeachingProfiles<T>(
    paginationDto: PaginationDto,
  ): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(paginationDto);

    const queryOptions: Prisma.ViewStaffTeachingProfileFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    };

    return await httpRequestFindMany<T>({
      serviceName: StaffService.name,
      model: this.prisma.viewStaffTeachingProfile,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
    🔍 FIND ONE TEACHING PROFILE BY CRITERIA (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Busca un perfil docente en la vista 'ViewStaffTeachingProfile'
    usando ID o staffId.
    ============================================================ */
  async findOneTeachingProfileBy<T>(
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

    const fieldMaps: TypeWhereFieldMap[] = [
      { type: 'id', field: 'id' },
      { type: 'curp', field: 'curp' },
    ];

    const whereCondition = buildWherePlain(type, value, fieldMaps);
    const queryOptions: Prisma.ViewStaffTeachingProfileFindUniqueArgs = {
      where: whereCondition as Prisma.ViewStaffTeachingProfileWhereUniqueInput,
    };

    return await httpRequestFindUnique<T>({
      serviceName: StaffService.name,
      model: client.viewStaffTeachingProfile,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });
  }

  /* ============================================================
    ✏️ UPDATE STAFF TEACHING PROFILE (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Actualiza el perfil docente de un miembro del personal.
    ============================================================ */
  async updateTeachingProfile<T>(
    params: UpdateEntityParams<UpdateStaffTeachingProfileDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, idValue, data, client, returnData } = extractUpdateParams(
      params,
      this.prisma,
    );

    const existing = await client.staffTeachingProfile.findUnique({
      where: { staffId: idValue as number },
      select: {
        id: true,
        staff: {
          select: {
            staff_status: { select: { isActive: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new BadRequestException(
        `El perfil docente para el personal con ID ${idValue} no existe.`,
      );
    }

    if (
      data.isClassroomTeacher === true &&
      !existing.staff?.staff_status?.isActive
    ) {
      throw new BadRequestException(
        'No se puede habilitar como docente frente a grupo a este personal porque su estado de personal actual está inactivo.',
      );
    }

    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_staff_teaching_profile_updated_byTousers: {
        connect: { id: userId },
      },
    };

    return await httpRequestUpdate<any, T>({
      serviceName: StaffService.name,
      model: client.staffTeachingProfile,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName: 'staffId',
    });
  }

  /* ============================================================
  🔄 toggleActive (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Invierte el estado 'isActive' de un miembro de personal.
  ============================================================ */
  /* ============================================================
    🔄 changeStatus (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Cambia el estatus (staffStatusId) de un miembro de personal.
    Valida la existencia del estatus.
    ============================================================ */
  async changeStatus(
    id: number,
    userId: number,
    dto: ChangeStaffStatusDto,
  ): Promise<ApiResponse<any>> {
    // 🔹 1. Buscar personal existente
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        persons: {
          select: {
            firstName: true,
            firstLastName: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: APP_MESSAGES.error.STAFF.NOT_FOUND(id),
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // 🔹 2. Validar que el estatus existe
    const targetStatus = await this.prisma.staffStatus.findUnique({
      where: { id: dto.staffStatusId },
      select: { id: true, name: true, isActive: true },
    });
    if (!targetStatus) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: `El estatus con ID ${dto.staffStatusId} no existe.`,
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 🔹 3. Actualizar
    const executeChange = async (txClient: any) => {
      const staffUpdate = await httpRequestUpdate({
        serviceName: StaffService.name,
        model: txClient.staff,
        logger: this.logger,
        idValue: id,
        data: {
          staff_status: { connect: { id: dto.staffStatusId } },
          users_staff_updated_byTousers: { connect: { id: userId } },
        },
      });

      await this.handleTeachingProfileInactivation(
        txClient,
        id,
        dto.staffStatusId,
        userId,
      );

      return staffUpdate;
    };

    const response = await this.prisma.$transaction(executeChange);

    const personName = staff.persons
      ? `${staff.persons.firstName} ${staff.persons.firstLastName}`.trim()
      : `Staff ID ${id}`;

    return {
      ...response,
      message: `El estatus de "${personName}" ha sido cambiado a "${targetStatus.name}" correctamente.`,
      data: {
        id,
        staffStatusId: dto.staffStatusId,
        statusName: targetStatus.name,
        isActive: targetStatus.isActive,
      },
    };
  }

  /* ============================================================
   🔄 toggleIsClassroomTeacher (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Invierte el estado 'isClassroomTeacher' (frente a grupo) de un personal.
   ============================================================ */
  async toggleIsClassroomTeacher(
    staffId: number,
    userId: number,
  ): Promise<ApiResponse<any>> {
    // 1. Obtener el personal y su perfil docente
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        staff_status: {
          select: { isActive: true },
        },
        persons: {
          select: {
            firstName: true,
            firstLastName: true,
          },
        },
        staff_teaching_profile: {
          select: {
            id: true,
            isClassroomTeacher: true,
          },
        },
      },
    });

    if (!staff || !staff.staff_teaching_profile) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El perfil docente para el personal con ID ${staffId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const personName = staff.persons
      ? `${staff.persons.firstName} ${staff.persons.firstLastName}`.trim()
      : `Staff ID ${staffId}`;

    const newStatus = !staff.staff_teaching_profile.isClassroomTeacher;

    // 2. PRE-CHECK: Debe estar activo como staff para habilitarse como docente frente a grupo (true)
    if (newStatus && !staff.staff_status?.isActive) {
      throw new ConflictException(
        qwikMessageResponse({
          success: false,
          message: `No se puede habilitar como docente frente a grupo a "${personName}" porque su estado de personal está inactivo.`,
          errorCode: 'CONFLICT',
        }),
      );
    }

    // 3. Actualizar el estado en el perfil
    await this.prisma.staffTeachingProfile.update({
      where: { id: staff.staff_teaching_profile.id },
      data: {
        isClassroomTeacher: newStatus,
        users_staff_teaching_profile_updated_byTousers: {
          connect: { id: userId },
        },
      },
    });

    return qwikMessageResponse({
      success: true,
      message: `El estado frente a grupo de "${personName}" ha sido cambiado a ${newStatus ? 'activo' : 'inactivo'}.`,
      data: {
        staffId,
        profileId: staff.staff_teaching_profile.id,
        isClassroomTeacher: newStatus,
      },
    });
  }

  /**
   * 🔒 Desactiva 'isClassroomTeacher' si el nuevo estatus es inactivo
   */
  private async handleTeachingProfileInactivation(
    tx: Prisma.TransactionClient,
    staffId: number,
    staffStatusId: number,
    userId: number,
  ): Promise<void> {
    const status = await tx.staffStatus.findUnique({
      where: { id: staffStatusId },
      select: { isActive: true },
    });

    if (status && !status.isActive) {
      const profile = await tx.staffTeachingProfile.findUnique({
        where: { staffId },
        select: { id: true },
      });

      if (profile) {
        await tx.staffTeachingProfile.update({
          where: { id: profile.id },
          data: {
            isClassroomTeacher: false,
            users_staff_teaching_profile_updated_byTousers: {
              connect: { id: userId },
            },
          },
        });
      }
    }
  }
}
