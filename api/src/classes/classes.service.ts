import { BadRequestException, Injectable } from '@nestjs/common';
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
import { CreateClassDto, QueryClassDto, UpdateClassDto } from './dto';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
   🔒 PRIVATE: generateClassCode
   ------------------------------------------------------------
   📌 Genera el código de clase automáticamente.
   Formato: {epCode}-{semesterNumber}-{year}
   Ejemplo: ESP-01-2024
   ============================================================ */
  private generateClassCode(
    epCode: string,
    semesterNumber: number,
    schoolYear: string,
  ): string {
    const year = schoolYear.split('-')[0];
    const code = epCode.substring(0, 3).toUpperCase(); // ← solo primeras 3 letras
    return `${code}-${semesterNumber.toString().padStart(2, '0')}-${year}`;
    // → 'FOR-08-2025' = 11 chars ✅
  }

  /* ============================================================
   🏫 CREATE CLASS (SICES V3)
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateClassDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { educationalProgramId: data.educationalProgramId, createdBy: userId },
      'Iniciando creación de clase',
    );

    // 🔹 1. Determinar semiannualPeriodId
    const isExtraordinary = data.isExtraordinaryPeriod ?? false;
    let semiannualPeriodId: number;

    if (isExtraordinary) {
      // Extraordinario → semiannualPeriodId obligatorio
      if (!data.semiannualPeriodId) {
        throw new BadRequestException(
          'El periodo semestral es obligatorio para periodos extraordinarios.',
        );
      }
      semiannualPeriodId = data.semiannualPeriodId;
    } else {
      // Regular → derivar automáticamente del semestre
      semiannualPeriodId = data.semesterId % 2 !== 0 ? 1 : 2;
    }

    // 🔹 2. Generar classCode automáticamente
    const [ep, schoolYear] = await Promise.all([
      client.educationalProgram.findUnique({
        where: { id: data.educationalProgramId },
        select: { code: true },
      }),
      client.schoolYear.findUnique({
        where: { id: data.schoolYearId },
        select: { schoolYear: true },
      }),
    ]);

    if (!ep)
      throw new BadRequestException(
        `El programa educativo con ID ${data.educationalProgramId} no existe.`,
      );
    if (!schoolYear)
      throw new BadRequestException(
        `El ciclo escolar con ID ${data.schoolYearId} no existe.`,
      );

    const classCode = this.generateClassCode(
      ep.code,
      data.semesterId,
      schoolYear.schoolYear,
    );

    this.logger.debug(
      {
        classCode,
        semiannualPeriodId,
        educationalProgramId: data.educationalProgramId,
      },
      'Datos para creación de clase',
    );

    // 🔹 3. Preparar objeto final
    const dtoToSave = {
      classCode,
      group: data.group ?? 'Único',
      shift: data.shift ?? 'Matutino',
      elective: data.elective ?? 'No aplica',
      educationalProgramId: data.educationalProgramId,
      schoolYearId: data.schoolYearId,
      semesterId: data.semesterId,
      semiannualPeriodId,
      createdBy: userId,
      updatedBy: userId,
    };

    // 🔹 4. Crear registro
    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: ClassesService.name,
      methodName: 'create',
      model: client.class,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }
  /* ============================================================
 🏫 FIND ONE BY (SICES V3 - UNIQUE)
 ------------------------------------------------------------
 📌 Descripción:
 Busca una clase utilizando campos @unique de la vista.
 - Búsqueda por ID o classCode
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
      { type: 'id', field: 'id' },
      { type: 'classCode', field: 'classCode' },
    ];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.class : client.viewClass;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        classCode: true,
        group: true,
        shift: true,
        educationalProgramId: true,
        schoolYearId: true,
        semesterId: true,
        semiannualPeriodId: true,
        elective: true,
        educational_programs: {
          select: {
            name: true,
          },
        },
        semesters: {
          select: {
            ordinalNumber: true,
          },
        },
        semiannual_periods: {
          select: {
            semiannualPeriod: true,
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const result = await httpRequestFindUnique<any>({
      serviceName: ClassesService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const cls = result.data;

      const sy = await client.schoolYear.findUnique({
        where: { id: cls.schoolYearId },
        select: { schoolYear: true },
      });

      result.data = {
        id: cls.id,
        classCode: cls.classCode,
        group: cls.group,
        shift: cls.shift,
        educationalProgramId: cls.educationalProgramId,
        schoolYearId: cls.schoolYearId,
        semesterId: cls.semesterId,
        semiannualPeriodId: cls.semiannualPeriodId,
        elective: cls.elective,
        educationalProgramName: cls.educational_programs?.name ?? null,
        semesterName: cls.semesters?.ordinalNumber ?? null,
        semiannualPeriodName: cls.semiannual_periods?.semiannualPeriod ?? null,
        schoolYearName: sy?.schoolYear ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  async findMany<T>(filters: QueryClassDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);

    const whereCondition = buildWhereMany<
      Prisma.ViewClassWhereInput,
      QueryClassDto
    >(filters, {
      contains: {
        schoolYear: 'schoolYear',
      },
      equals: {
        classCode: 'classCode',
        academicDiscipline: 'academicDiscipline',
        educationLevel: 'educationLevel',
        semiannualPeriod: 'semiannualPeriod',
        semester: 'semester',
        modality: 'modality',
      },
      orSearch: [
        'classCode',
        'educationLevel',
        'schoolYear',
        'semiannualPeriod',
        'academicDiscipline',
        'modality',
      ],
    });

    const queryOptions: Prisma.ViewClassFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [{ schoolYear: 'desc' }, { semester: 'asc' }],
    };

    return await httpRequestFindMany<T>({
      serviceName: ClassesService.name,
      model: this.prisma.viewClass,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
 ✏️ UPDATE CLASS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Actualiza una clase. Si cambian campos que componen el
 classCode lo reconstruye automáticamente.
============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateClassDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 🔹 1. Reconstruir classCode y semiannualPeriodId
    //    solo si cambian campos que los componen
    let newClassCode: string | undefined;
    let newSemiannualPeriodId: number | undefined;

    if (data.educationalProgramId || data.semesterId || data.schoolYearId) {
      const currentClass = await client.class.findUnique({
        where: { id: Number(idValue) },
        select: {
          educationalProgramId: true,
          semesterId: true,
          schoolYearId: true,
        },
      });

      if (!currentClass) {
        throw new BadRequestException(`La clase con ID ${idValue} no existe.`);
      }

      const educationalProgramId =
        data.educationalProgramId ?? currentClass.educationalProgramId;
      const semesterId = data.semesterId ?? currentClass.semesterId;
      const schoolYearId = data.schoolYearId ?? currentClass.schoolYearId;

      const [ep, schoolYear] = await Promise.all([
        client.educationalProgram.findUnique({
          where: { id: educationalProgramId },
          select: { code: true },
        }),
        client.schoolYear.findUnique({
          where: { id: schoolYearId },
          select: { schoolYear: true },
        }),
      ]);

      if (!ep)
        throw new BadRequestException(
          `El programa educativo con ID ${educationalProgramId} no existe.`,
        );
      if (!schoolYear)
        throw new BadRequestException(
          `El ciclo escolar con ID ${schoolYearId} no existe.`,
        );

      // Reconstruir classCode
      newClassCode = this.generateClassCode(
        ep.code,
        semesterId,
        schoolYear.schoolYear,
      );

      // Recalcular semiannualPeriodId si cambia el semestre
      if (data.semesterId) {
        const isExtraordinary = data.isExtraordinaryPeriod ?? false;

        if (isExtraordinary) {
          // Extraordinario → semiannualPeriodId obligatorio
          if (!data.semiannualPeriodId) {
            throw new BadRequestException(
              'El periodo semestral es obligatorio para periodos extraordinarios.',
            );
          }
          newSemiannualPeriodId = data.semiannualPeriodId;
        } else {
          // Regular → derivar automáticamente
          newSemiannualPeriodId = semesterId % 2 !== 0 ? 1 : 2;
        }
      }
    }

    // 🔹 2. Extraer campos no mapeables y transformar relaciones
    const {
      updatedBy,
      isExtraordinaryPeriod,
      semiannualPeriodId,
      ...dataToTransform
    } = data as unknown as Record<string, unknown>;

    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 3. Construir objeto final
    const dataToUpdate = {
      ...relationalData,
      ...(newClassCode && { classCode: newClassCode }),
      ...(newSemiannualPeriodId && {
        semiannual_periods: { connect: { id: newSemiannualPeriodId } },
      }),
      users_classes_updated_byTousers: { connect: { id: userId } },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de clase',
    );

    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: ClassesService.name,
      model: client.class,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }
}
