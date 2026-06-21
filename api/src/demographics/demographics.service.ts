import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractCreateParams,
  extractFindParams,
  extractUpdateParams,
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
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateDemographicDto,
  CreateManyDemographicDto,
  QueryDemographicDto,
  UpdateDemographicDto,
} from './dto';

@Injectable()
export class DemographicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
   👤 CREATE DEMOGRAPHIC (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea los datos demográficos de una persona.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateDemographicDto>,
  ): Promise<ApiResponse<T>> {
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { personId: data.personId, createdBy: userId },
      'Iniciando creación de datos demográficos',
    );

    const dtoToSave = {
      personId: data.personId,
      maritalStatusId: data.maritalStatusId ?? 1,
      indigenousLangId: data.indigenousLangId ?? 1,
      foreignLangId: data.foreignLangId ?? 1,
      specialConditionId: data.specialConditionId ?? 1,
      isIndigenous: data.isIndigenous ?? false,
      isAfroDescendant: data.isAfroDescendant ?? false,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { personId: data.personId },
      'Datos para creación de datos demográficos',
    );

    const result = await httpRequestCreate<typeof dtoToSave, any>({
      serviceName: DemographicsService.name,
      methodName: 'create',
      model: client.demographic,
      logger: this.logger,
      data: dtoToSave,
      returnData: true, // Forzar la obtención del ID para la vista
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewDemographic.findUnique({
        where: { id: result.data.id },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }

  /* ============================================================
 🆕 CREATE MANY DEMOGRAPHICS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Crea datos demográficos de múltiples personas en una sola
 operación (bulk insert).
============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyDemographicDto>,
  ): Promise<ApiResponse<void>> {
    const { userId, data, client } = extractCreateParams(params, this.prisma);

    this.logger.info(
      { total: data.demographics.length, createdBy: userId },
      'Iniciando creación masiva de datos demográficos',
    );

    const preparedData = data.demographics.map((demographic) => ({
      personId: demographic.personId,
      maritalStatusId: demographic.maritalStatusId ?? 1,
      indigenousLangId: demographic.indigenousLangId ?? 1,
      foreignLangId: demographic.foreignLangId ?? 1,
      specialConditionId: demographic.specialConditionId ?? 1,
      isIndigenous: demographic.isIndigenous ?? false,
      isAfroDescendant: demographic.isAfroDescendant ?? false,
      createdBy: userId,
      updatedBy: userId,
    }));

    return await httpRequestCreateMany({
      serviceName: DemographicsService.name,
      model: client.demographic,
      logger: this.logger,
      data: preparedData,
    });
  }

  /* ============================================================
📋 FIND MANY DEMOGRAPHICS (SICES V3)
------------------------------------------------------------
📌 Descripción:
Listado de datos demográficos con búsqueda por nombre.
============================================================ */

  async findMany<T>(filters: QueryDemographicDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción automática
    const whereCondition = buildWhereMany<
      Prisma.ViewDemographicWhereInput,
      QueryDemographicDto
    >(filters, {
      orSearch: ['fullName'],
      equals: {
        isIndigenous: 'isIndigenous',
        isAfroDescendant: 'isAfroDescendant',
      },
      contains: {
        fullName: 'fullName',
        maritalStatus: 'maritalStatus',
        indigenousLanguage: 'indigenousLanguage',
        foreignLanguage: 'foreignLanguage',
        specialCondition: 'specialCondition',
      },
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewDemographicFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),

      where: whereCondition,

      orderBy: {
        firstLastName: 'asc',
      },
    };

    // 🔹 Helper centralizado
    return await httpRequestFindMany<T>({
      serviceName: DemographicsService.name,

      model: this.prisma.viewDemographic,

      logger: this.logger,

      queryOptions,

      dto: filters,
    });
  }

  /* ============================================================
 🔍 FIND ONE DEMOGRAPHIC BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Busca datos demográficos en la vista 'ViewDemographic'.
 - Búsqueda por ID o CURP
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
    const model = isLight ? client.demographic : client.viewDemographic;

    // 🔹 3. Construcción WHERE
    let whereCondition: any;
    if (isLight) {
      if (type === 'curp') {
        const person = await client.person.findUnique({
          where: { curp: String(value) },
          select: { id: true },
        });
        if (!person) {
          if (throwIfNotFound) {
            throw new NotFoundException(`No se encontraron datos demográficos para la persona con CURP ${value}`);
          }
          return qwikMessageResponse({
            success: true,
            message: 'Registro no encontrado.',
            data: null,
          });
        }
        whereCondition = { personId: person.id };
      } else {
        whereCondition = buildWherePlain(type, value, [
          { type: 'id', field: 'id' },
        ]);
      }
    } else {
      const fieldMaps: TypeWhereFieldMap[] = [
        { type: 'id', field: 'id' },
        { type: 'curp', field: 'curp' },
      ];
      whereCondition = buildWherePlain(type, value, fieldMaps);
    }

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        personId: true,
        maritalStatusId: true,
        indigenousLangId: true,
        foreignLangId: true,
        specialConditionId: true,
        isIndigenous: true,
        isAfroDescendant: true,
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
        marital_statuses: {
          select: {
            status: true,
          },
        },
        indigenous_languages: {
          select: {
            name: true,
          },
        },
        foreign_languages: {
          select: {
            name: true,
          },
        },
        special_conditions: {
          select: {
            name: true,
          },
        },
      };
    }

    // 🔹 5. Ejecución
    const result = await httpRequestFindUnique<any>({
      serviceName: DemographicsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const demographic = result.data;
      const person = demographic.persons ?? {};
      let age: number | null = null;
      if (person.birthDate) {
        const birth = new Date(person.birthDate);
        const ageDifMs = Date.now() - birth.getTime();
        const ageDate = new Date(ageDifMs);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      result.data = {
        id: demographic.id,
        personId: demographic.personId,
        curp: person.curp ?? null,
        fullName: person.fullName ?? null,
        firstName: person.firstName ?? null,
        firstLastName: person.firstLastName ?? null,
        secondLastName: person.secondLastName ?? null,
        gender: person.gender ?? null,
        age,
        maritalStatus: demographic.marital_statuses?.status ?? null,
        indigenousLanguage: demographic.indigenous_languages?.name ?? null,
        foreignLanguage: demographic.foreign_languages?.name ?? null,
        specialCondition: demographic.special_conditions?.name ?? null,
        isIndigenous: demographic.isIndigenous,
        isAfroDescendant: demographic.isAfroDescendant,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
 ✏️ UPDATE DEMOGRAPHIC (SICES V3)
============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateDemographicDto>,
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
      users_demographics_updated_byTousers: { connect: { id: userId } },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de datos demográficos',
    );

    const result = await httpRequestUpdate<typeof dataToUpdate, any>({
      serviceName: DemographicsService.name,
      model: client.demographic,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData: true, // Forzar la obtención del ID para la vista
      idFieldName,
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewDemographic.findUnique({
        where: { id: Number(idValue) },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }
}
