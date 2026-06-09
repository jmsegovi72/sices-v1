import { BadRequestException, Injectable } from '@nestjs/common';
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
  CreateSchoolOfOriginDto,
  QuerySchoolOfOriginDto,
  UpdateSchoolsOfOriginDto,
} from './dto';

@Injectable()
export class SchoolsOfOriginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}
  /* ============================================================
   🏫 CREATE SCHOOL OF ORIGIN (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea una escuela de procedencia siguiendo el patrón estándar.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateSchoolOfOriginDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { cct: data.cct, createdBy: userId },
      'Iniciando creación de escuela de procedencia',
    );

    const dtoToSave = {
      cct: data.cct,
      name: data.name,
      fundingSource: data.fundingSource ?? 'No especificado',
      offeredLevelId: data.offeredLevelId,
      municipalityId: data.municipalityId,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { cct: data.cct, municipalityId: data.municipalityId },
      'Datos para creación de escuela de procedencia',
    );

    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: SchoolsOfOriginService.name,
      methodName: 'create',
      model: client.schoolOfOrigin,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  /* ============================================================
   📋 FIND ALL SCHOOLS OF ORIGIN (SICES V3)
   ============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(paginationDto);

    const queryOptions: Prisma.ViewSchoolOfOriginFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: { schoolName: 'asc' },
    };

    return await httpRequestFindMany<T>({
      serviceName: SchoolsOfOriginService.name,
      model: this.prisma.viewSchoolOfOrigin,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
📋 FIND MANY SCHOOLS OF ORIGIN (SICES V3)
============================================================ */

  async findMany<T>(
    filters: QuerySchoolOfOriginDto,
  ): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción automática
    const whereCondition = buildWhereMany<
      Prisma.ViewSchoolOfOriginWhereInput,
      QuerySchoolOfOriginDto
    >(filters, {
      /**
       * 🔹 Si existe searchTerm:
       * usar búsqueda global
       * e ignorar contains.
       */
      searchTermMode: true,
      contains: {
        schoolName: 'schoolName',
        stateName: 'stateName',
        municipalityName: 'municipalityName',
        cct: 'cct',
        educationLevel: 'educationLevel',
      },
      equals: {
        cct: 'cct',
        fundingSource: 'fundingSource',
      },
      orSearch: [
        'schoolName',
        'educationLevel',
        'municipalityName',
        'stateName',
      ],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewSchoolOfOriginFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),

      where: whereCondition,

      orderBy: {
        schoolName: 'asc',
      },
    };

    // 🔹 Helper centralizado
    return await httpRequestFindMany<T>({
      serviceName: SchoolsOfOriginService.name,

      model: this.prisma.viewSchoolOfOrigin,

      logger: this.logger,

      queryOptions,

      dto: filters,
    });
  }

  /* ============================================================
   🔍 FIND ONE SCHOOL OF ORIGIN BY CRITERIA (SICES V3)
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

    // 🔹 3. Mapeo dinámico
    const fieldMaps: TypeWhereFieldMap[] = [
      { type: 'id', field: 'id' },
      { type: 'cct', field: 'cct' },
    ];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.schoolOfOrigin : client.viewSchoolOfOrigin;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        cct: true,
        name: true,
        fundingSource: true,
        offeredLevelId: true,
        municipalityId: true,
        school_offered_levels: {
          select: {
            offeredEducationLevel: true,
          },
        },
        municipalities: {
          select: {
            municipality: true,
            states: {
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
      serviceName: SchoolsOfOriginService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const school = result.data;
      result.data = {
        id: school.id,
        cct: school.cct,
        schoolName: school.name,
        fundingSource: school.fundingSource,
        offeredLevelId: school.offeredLevelId,
        municipalityId: school.municipalityId,
        educationLevel: school.school_offered_levels?.offeredEducationLevel ?? null,
        municipalityName: school.municipalities?.municipality ?? null,
        stateName: school.municipalities?.states?.name ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
   ✏️ UPDATE SCHOOL OF ORIGIN (SICES V3)
   ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateSchoolsOfOriginDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    const relationalData = transformRelationIds(dataToTransform);

    const dataToUpdate = {
      ...relationalData,
      users_schools_of_origin_updated_byTousers: { connect: { id: userId } },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de escuela de procedencia',
    );

    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: SchoolsOfOriginService.name,
      model: client.schoolOfOrigin,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }
}
