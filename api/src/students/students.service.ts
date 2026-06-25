import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ViewPerson } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { PinoLogger } from 'nestjs-pino';
import { PaginationDto, SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractCreateParams,
  extractFindParams,
  extractUpdateParams,
  httpRequestBatchUpdate,
  httpRequestCreate,
  httpRequestCreateMany,
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
import { PersonsService } from '@/persons/persons.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateManyStudentDto,
  CreateStudentDto,
  QueryStudentDto,
  UpdateBatchStudentCodesDto,
  UpdateBatchStudentMailsDto,
  UpdateStudentDto,
} from './dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly personsService: PersonsService,
  ) {}
  /* ============================================================
   🎓 CREATE STUDENT (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Da de alta a una persona como alumno siguiendo el patrón
   estándar del sistema.
   - Matrícula temporal autogenerada
   - Correo institucional temporal autogenerado
   - Status default: NI (Nuevo Ingreso)
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateStudentDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { personId: data.personId, createdBy: userId },
      'Iniciando alta de alumno',
    );

    // 🔹 2. Obtener persona via PersonsService (verificar existencia)
    const personResponse = await this.personsService.findOneBy<ViewPerson>({
      searchDto: plainToClass(SearchDto, { search: String(data.personId) }),
    });

    if (!personResponse.data) {
      throw new BadRequestException(
        `La persona con ID ${data.personId} no existe.`,
      );
    }

    // 🔹 2.b Verificar si la persona ya es un alumno activo
    const activeStudent = await client.student.findFirst({
      where: {
        personId: data.personId,
        student_status: {
          isActive: true,
        },
      },
      include: {
        educational_programs: true,
      },
    });

    if (activeStudent) {
      throw new BadRequestException(
        `La persona ya está registrada como alumno activo en el programa '${activeStudent.educational_programs.name}'.`,
      );
    }

    // 🔹 3. Asignar matrícula y correo (null si no vienen)
    const codeNumber = data.codeNumber ?? null;
    const institutionalMail = data.email ?? null;

    // 🔹 4. Preparar objeto final
    const dtoToSave = {
      personId: data.personId,
      generationId: data.generationId,
      educationalProgramId: data.educationalProgramId,
      codeNumber,
      institutionalMail,
      statusId: data.statusId ?? 6, // ← si no viene → NI por default
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { personId: data.personId, codeNumber, institutionalMail },
      'Datos para alta de alumno',
    );

    // 🔹 5. Crear registro
    const result = await httpRequestCreate<typeof dtoToSave, any>({
      serviceName: StudentsService.name,
      methodName: 'create',
      model: client.student,
      logger: this.logger,
      data: dtoToSave,
      returnData: true,
    });

    if (result.success && returnData) {
      const viewData = await client.viewStudent.findUnique({
        where: { id: result.data.id },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result as unknown as ApiResponse<T>;
  }
  /* ============================================================
 🆕 CREATE MANY STUDENTS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Da de alta múltiples alumnos en una sola operación (bulk insert).
 - Matrícula y correo se guardan como null si no vienen
 - Status default: NI (Nuevo Ingreso)
 - Mantiene auditoría
============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyStudentDto>,
  ): Promise<ApiResponse<void>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client } = extractCreateParams(params, this.prisma);

    this.logger.info(
      { total: data.students.length, createdBy: userId },
      'Iniciando alta masiva de alumnos',
    );

    // 🔹 2. Obtener existencia de todas las personas
    const personIds = data.students.map((s) => s.personId);
    const persons = await client.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true },
    });

    // 🔹 2.b Verificar si alguna de las personas ya es un alumno activo
    const activeStudents = await client.student.findMany({
      where: {
        personId: { in: personIds },
        student_status: {
          isActive: true,
        },
      },
      include: {
        educational_programs: true,
      },
    });

    if (activeStudents.length > 0) {
      const activeInfo = activeStudents
        .map((s) => `Persona ID ${s.personId} en '${s.educational_programs.name}'`)
        .join(', ');
      throw new BadRequestException(
        `No se puede realizar la inserción masiva porque ya existen alumnos activos: ${activeInfo}`,
      );
    }

    // 🔹 3. Mapear personId para acceso rápido
    const personSet = new Set(persons.map((p) => p.id));

    // 🔹 4. Preparar datos
    const preparedData = data.students.map((student) => {
      if (!personSet.has(student.personId)) {
        throw new BadRequestException(
          `La persona con ID ${student.personId} no existe.`,
        );
      }

      return {
        personId: student.personId,
        generationId: student.generationId,
        educationalProgramId: student.educationalProgramId,
        codeNumber: student.codeNumber ?? null,
        institutionalMail: student.email ?? null,
        statusId: student.statusId ?? 6,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    // 🔹 5. Inserción masiva
    return await httpRequestCreateMany({
      serviceName: StudentsService.name,
      model: client.student,
      logger: this.logger,
      data: preparedData,
    });
  }

  /* ============================================================
 📋 FIND ALL STUDENTS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Obtiene un listado de alumnos desde la vista 'ViewStudent'.
 - Usa paginación segura
 - Respuesta estandarizada
 - No requiere mapper (la vista ya entrega datos limpios)
============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Extraer paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewStudentFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: {
        firstLastName: 'asc',
      },
    };

    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: StudentsService.name,
      model: this.prisma.viewStudent,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
 🔍 FIND ONE STUDENT BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Busca un alumno en la vista 'ViewStudent' utilizando
 detección automática del SearchDto.
 - Búsqueda por studentId o studentCode
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

    const isLight = params.options?.light === true;
    const model = isLight ? client.student : client.viewStudent;

    // 🔹 3. Mapeo dinámico (adaptado si se usa la tabla base o la vista)
    const dbFieldMaps: TypeWhereFieldMap[] = isLight
      ? [
          { type: 'id', field: 'id' },
          { type: 'studentCode', field: 'codeNumber' },
        ]
      : [
          { type: 'id', field: 'id' },
          { type: 'studentCode', field: 'studentCode' },
        ];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, dbFieldMaps);
    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        personId: true,
        generationId: true,
        educationalProgramId: true,
        codeNumber: true,
        institutionalMail: true,
        statusId: true,
        persons: {
          select: {
            firstName: true,
            firstLastName: true,
            secondLastName: true,
            curp: true,
          },
        },
        educational_programs: {
          select: {
            name: true,
          },
        },
        student_generations: {
          select: {
            generationName: true,
          },
        },
        student_status: {
          select: {
            description: true,
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const result = await httpRequestFindUnique<any>({
      serviceName: StudentsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const student = result.data;
      result.data = {
        id: student.id,
        personId: student.personId,
        generationId: student.generationId,
        educationalProgramId: student.educationalProgramId,
        codeNumber: student.codeNumber,
        institutionalMail: student.institutionalMail,
        statusId: student.statusId,
        studentName: student.persons
          ? `${student.persons.firstName} ${student.persons.firstLastName} ${student.persons.secondLastName || ''}`.trim()
          : null,
        curp: student.persons?.curp ?? null,
        educationalProgramName: student.educational_programs?.name ?? null,
        generationName: student.student_generations?.generationName ?? null,
        statusDescription: student.student_status?.description ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }
  /* ============================================================
🔎 FIND MANY STUDENTS (SICES V3)
------------------------------------------------------------
📌 Descripción:
Listado de alumnos con filtros dinámicos.
============================================================ */

  async findMany<T>(filters: QueryStudentDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación
    const pagination = resolvePagination(filters);


    const whereCondition = buildWhereMany<
      Prisma.ViewStudentWhereInput,
      QueryStudentDto
    >(filters, {
      searchTermMode: true,
      contains: {
        firstName: 'firstName',
        firstLastName: 'firstLastName',
        secondLastName: 'secondLastName',
        curp: 'curp',
        codeNumber: 'studentCode',
        stateName: 'birthState',
        municipalityName: 'birthMunicipality',
      },
      equals: {
        academicDiscipline: 'academicDiscipline',
        educationLevel: 'educationLevel',
        modality: 'modality',
        studyPlan: 'studyPlan',
        generation: 'generation',
        semester: 'currentSemester',
        schoolYear: 'educationCycle',
        statusKey: 'statusKey',
        isActive: 'isActive',
      },
      orSearch: [
        'fullName',
        'curp',
        'studentCode',
        'institutionalMail',
        'educationalProgram',
      ],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewStudentFindManyArgs = {
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

    // 🔹 Helper centralizado
    return await httpRequestFindMany<T>({
      serviceName: StudentsService.name,

      model: this.prisma.viewStudent,

      logger: this.logger,

      queryOptions,

      dto: filters,
    });
  }
  /* ============================================================
  ✏️ UPDATE STUDENT (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Actualiza un alumno siguiendo el patrón estándar del sistema.
  Solo actualizaciones menores — matrícula y correo tienen
  sus propios endpoints.
  ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateStudentDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 1. Obtener registro actual del alumno e incluir su estatus
    const currentStudent = await client.student.findUnique({
      where: { id: Number(idValue) },
      include: { student_status: true },
    });

    if (!currentStudent) {
      throw new NotFoundException(`El alumno con ID ${idValue} no existe.`);
    }

    // 🔹 VALIDACIÓN 1: Restringir edición a alumnos inactivos (a menos que se esté reactivando)
    if (!currentStudent.student_status.isActive) {
      let isReactivating = false;
      if (data.statusId !== undefined && data.statusId !== currentStudent.statusId) {
        const newStatus = await client.studentStatus.findUnique({
          where: { id: data.statusId },
        });
        if (newStatus && newStatus.isActive) {
          isReactivating = true;
        }
      }

      if (!isReactivating) {
        throw new BadRequestException(
          `No se puede modificar la información de un alumno que se encuentra inactivo (estatus actual: '${currentStudent.student_status.description}').`
        );
      }
    }

    // 🔹 VALIDACIÓN 2: Validar si se está intentando cambiar programa o generación
    const isChangingProgram =
      data.educationalProgramId !== undefined &&
      data.educationalProgramId !== null;

    const isChangingGeneration =
      data.generationId !== undefined &&
      data.generationId !== null;

    if (isChangingProgram || isChangingGeneration) {
      const realChangeProgram =
        isChangingProgram &&
        data.educationalProgramId !== currentStudent.educationalProgramId;

      const realChangeGeneration =
        isChangingGeneration &&
        data.generationId !== currentStudent.generationId;

      if (realChangeProgram || realChangeGeneration) {
        if (currentStudent.student_status.statusKey !== 'NI') {
          throw new BadRequestException(
            `No se permite cambiar el programa educativo o la generación de un alumno que ya no está en estatus 'Nuevo Ingreso' (estatus actual: '${currentStudent.student_status.description}'). Si el alumno va a cursar un nuevo programa, debe darse de alta un nuevo registro.`
          );
        }
      }
    }

    // 🔹 1. Extraer updatedBy para manejarlo manualmente
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    if ('email' in dataToTransform) {
      dataToTransform.institutionalMail = dataToTransform.email;
      delete dataToTransform.email;
    }

    // 🔹 2. Transformar IDs escalares a objetos connect
    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 3. Construir objeto final
    const dataToUpdate = {
      ...relationalData,
      users_students_updated_byTousers: { connect: { id: userId } },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de alumno',
    );

    const result = await httpRequestUpdate<typeof dataToUpdate, any>({
      serviceName: StudentsService.name,
      model: client.student,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData: true,
      idFieldName,
    });

    if (result.success && returnData) {
      const viewData = await client.viewStudent.findUnique({
        where: { id: Number(idValue) },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result as unknown as ApiResponse<R>;
  }
  /* ============================================================
 📧 UPDATE BATCH STUDENT EMAILS (SICES V3)
 ============================================================ */
  async updateBatchStudentEmails(
    userId: number,
    dto: UpdateBatchStudentMailsDto,
  ): Promise<ApiResponse<void>> {
    const { updatesMails } = dto;

    return httpRequestBatchUpdate({
      prisma: this.prisma,
      logger: this.logger,
      userId,
      updates: updatesMails,
      txModel: this.prisma.student,
      fieldKey: 'institutionalMail',
      // idFieldKey    ← default 'id'
      // dbIdFieldKey  ← default 'id'
      updatedByRelation: 'users_students_updated_byTousers',
      successMessage: `Se actualizaron ${updatesMails.length} correos institucionales correctamente.`,
      errorContext: 'correos institucionales',
      serviceName: StudentsService.name,
    });
  }
  /* ============================================================
 🎓 UPDATE BATCH STUDENT CODES (SICES V3)
 ============================================================ */
  async updateBatchStudentCodes(
    userId: number,
    dto: UpdateBatchStudentCodesDto,
  ): Promise<ApiResponse<void>> {
    const { updatesCodes } = dto;

    return httpRequestBatchUpdate({
      prisma: this.prisma,
      logger: this.logger,
      userId,
      updates: updatesCodes,
      txModel: this.prisma.student,
      fieldKey: 'codeNumber',
      // idFieldKey    ← default 'id'
      // dbIdFieldKey  ← default 'id'
      updatedByRelation: 'users_students_updated_byTousers',
      successMessage: `Se actualizaron ${updatesCodes.length} matrículas correctamente.`,
      errorContext: 'matrículas',
      serviceName: StudentsService.name,
    });
  }
}
