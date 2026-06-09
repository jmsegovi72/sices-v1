import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
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
  CreateStudentAcademicBackgroundDto,
  QueryStudentAcademicBackgroundDto,
  UpdateStudentAcademicBackgroundDto,
} from './dto';

@Injectable()
export class StudentAcademicBackgroundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}
  /* ============================================================
   🎓 CREATE STUDENT ACADEMIC BACKGROUND (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Registra el historial académico previo de un alumno.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateStudentAcademicBackgroundDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { studentId: data.studentId, createdBy: userId },
      'Iniciando registro de historial académico',
    );

    const dtoToSave = {
      studentId: data.studentId,
      schoolOfOriginId: data.schoolOfOriginId,
      professionalDegreeId: data.professionalDegreeId ?? 1,
      average: data.average ?? '0.00',
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { studentId: data.studentId, schoolOfOriginId: data.schoolOfOriginId },
      'Datos para registro de historial académico',
    );

    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: StudentAcademicBackgroundsService.name,
      methodName: 'create',
      model: client.studentAcademicBackground,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(paginationDto);

    const queryOptions: Prisma.ViewStudentAcademicBackgroundFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: { studentFullName: 'asc' },
    };

    return await httpRequestFindMany<T>({
      serviceName: StudentAcademicBackgroundsService.name,
      model: this.prisma.viewStudentAcademicBackground,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  async findMany<T>(
    filters: QueryStudentAcademicBackgroundDto,
  ): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewStudentAcademicBackgroundWhereInput,
      QueryStudentAcademicBackgroundDto
    >(filters, {
      contains: {
        fullName: 'studentFullName', // ← QueryPersonalInfoDto → Vista
        curp: 'studentCurp', // ← QueryPersonalInfoDto → Vista
        stateName: 'schoolState', // ← QueryLocationDto → Vista
        municipalityName: 'schoolMunicipality', // ← QueryLocationDto → Vista
      },
      orSearch: ['studentFullName', 'studentCurp', 'schoolName', 'schoolState'],
    });

    const queryOptions: Prisma.ViewStudentAcademicBackgroundFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: { studentFullName: 'asc' },
    };

    return await httpRequestFindMany<T>({
      serviceName: StudentAcademicBackgroundsService.name,
      model: this.prisma.viewStudentAcademicBackground,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
  🎓 FIND ONE BY (SICES V3 - UNIQUE)
  ------------------------------------------------------------
  📌 Descripción:
  Busca un historial académico utilizando campos @unique de
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

    const isLight = params.options?.light === true;
    const model = isLight ? client.studentAcademicBackground : client.viewStudentAcademicBackground;

    // 🔹 3. Construcción WHERE
    let whereCondition: any;
    if (isLight) {
      if (type === 'studentCode') {
        const student = await client.student.findUnique({
          where: { codeNumber: String(value) },
          select: { id: true },
        });
        if (!student) {
          if (throwIfNotFound) {
            throw new NotFoundException(`No se encontró el alumno con código ${value}`);
          }
          return qwikMessageResponse({
            success: true,
            message: 'Registro no encontrado.',
            data: null,
          });
        }
        whereCondition = { studentId: student.id };
      } else {
        whereCondition = buildWherePlain(type, value, [
          { type: 'id', field: 'id' },
        ]);
      }
    } else {
      const fieldMaps: TypeWhereFieldMap[] = [
        { type: 'id', field: 'id' },
        { type: 'studentCode', field: 'studentCode' },
      ];
      whereCondition = buildWherePlain(type, value, fieldMaps);
    }

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        studentId: true,
        schoolOfOriginId: true,
        professionalDegreeId: true,
        average: true,
        students: {
          select: {
            codeNumber: true,
            persons: {
              select: {
                firstName: true,
                firstLastName: true,
                secondLastName: true,
                curp: true,
              },
            },
          },
        },
        professional_degrees: {
          select: {
            name: true,
          },
        },
        schools_of_origin: {
          select: {
            cct: true,
            name: true,
            fundingSource: true,
            school_offered_levels: {
              select: {
                offeredEducationLevel: true,
              },
            },
            municipalities: {
              select: {
                name: true,
                states: {
                  select: {
                    name: true,
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
      serviceName: StudentAcademicBackgroundsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const background = result.data;
      const student = background.students ?? {};
      const person = student.persons ?? {};
      const school = background.schools_of_origin ?? {};
      result.data = {
        id: background.id,
        studentId: background.studentId,
        schoolOfOriginId: background.schoolOfOriginId,
        professionalDegreeId: background.professionalDegreeId,
        average: background.average,
        studentCode: student.codeNumber ?? null,
        studentCurp: person.curp ?? null,
        studentFullName: person.firstName
          ? `${person.firstName} ${person.firstLastName} ${person.secondLastName || ''}`.trim()
          : null,
        schoolCct: school.cct ?? null,
        schoolName: school.name ?? null,
        schoolFundingSource: school.fundingSource ?? null,
        schoolOfferedLevel: school.school_offered_levels?.offeredEducationLevel ?? null,
        schoolMunicipality: school.municipalities?.name ?? null,
        schoolState: school.municipalities?.states?.name ?? null,
        professionalDegree: background.professional_degrees?.name ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
  🎓 UPDATE STUDENT ACADEMIC BACKGROUND (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Actualiza el historial académico previo de un alumno.
  ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateStudentAcademicBackgroundDto>,
  ): Promise<ApiResponse<R>> {
    // 🔹 1. Extracción estándar
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 🔹 2. Separar auditoría y transformar relaciones
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 3. Construir objeto final
    const dataToUpdate = {
      ...relationalData,
      users_student_academic_backgrounds_updated_byTousers: {
        connect: { id: userId },
      },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de historial académico',
    );

    // 🔹 4. Ejecución
    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: StudentAcademicBackgroundsService.name,
      model: client.studentAcademicBackground,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }
}
