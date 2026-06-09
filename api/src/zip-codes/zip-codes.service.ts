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
import { PrismaService } from '@/prisma';
import { QueryZipCodeDto } from './dto';
import { CreateZipCodeDto } from './dto/create-zip-code.dto';
import { UpdateZipCodeDto } from './dto/update-zip-code.dto';

@Injectable()
export class ZipCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /* ============================================================
   📮 CREATE ZIP CODE (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea un código postal siguiendo el patrón estándar del sistema.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateZipCodeDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { zipCode: data.zipCode, createdBy: userId },
      'Iniciando creación de código postal',
    );

    // 🔹 2. Preparar objeto final
    const dtoToSave = {
      zipCode: data.zipCode,
      settlement: data.settlement,
      settlementTypeId: data.settlementTypeId,
      municipalityId: data.municipalityId,
      locality: data.locality ?? '',
      zoneType: data.zoneType,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { zipCode: data.zipCode, municipalityId: data.municipalityId },
      'Datos para creación de código postal',
    );

    // 🔹 3. Crear registro
    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: ZipCodesService.name,
      methodName: 'create',
      model: client.zipCode,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  /* ============================================================
 📋 FIND ALL ZIP CODES (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Obtiene un listado de códigos postales desde la vista 'ViewZipCode'.
 - Usa paginación segura
 - Respuesta estandarizada
 - No requiere mapper (la vista ya entrega datos limpios)
============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Extraer paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewZipCodeFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: {
        zipCode: 'asc',
      },
    };

    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: ZipCodesService.name,
      model: this.prisma.viewZipCode, // 🔥 lectura desde vista
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
 🔍 FIND ONE ZIP CODE BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Busca un código postal en la vista 'ViewZipCode' utilizando
 detección automática del SearchDto.
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
    const fieldMaps: TypeWhereFieldMap[] = [{ type: 'id', field: 'id' }];
    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.zipCode : client.viewZipCode;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        zipCode: true,
        settlement: true,
        settlementTypeId: true,
        municipalityId: true,
        locality: true,
        zoneType: true,
        settlement_types: {
          select: {
            settlementType: true,
            abbreviation: true,
          },
        },
        municipalities: {
          select: {
            municipality: true,
            municipalCapital: true,
            stateId: true,
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
      serviceName: ZipCodesService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const zipCode = result.data;
      result.data = {
        id: zipCode.id,
        zipCode: zipCode.zipCode,
        settlement: zipCode.settlement,
        settlementTypeId: zipCode.settlementTypeId,
        settlementType: zipCode.settlement_types?.settlementType ?? null,
        abbreviation: zipCode.settlement_types?.abbreviation ?? null,
        locality: zipCode.locality,
        zoneType: zipCode.zoneType,
        municipalityId: zipCode.municipalityId,
        municipality: zipCode.municipalities?.municipality ?? null,
        municipalCapital: zipCode.municipalities?.municipalCapital ?? null,
        stateId: zipCode.municipalities?.stateId ?? null,
        stateName: zipCode.municipalities?.states?.name ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
📋 FIND MANY ZIP CODES (SICES V3)
------------------------------------------------------------
📌 Descripción:
Listado de códigos postales con filtros dinámicos.
============================================================ */

  async findMany<T>(filters: QueryZipCodeDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción dinámica WHERE
    const whereCondition = buildWhereMany<
      Prisma.ViewZipCodeWhereInput,
      QueryZipCodeDto
    >(filters, {
      // 🔹 Búsquedas parciales
      contains: {
        settlement: 'settlement',
        settlementType: 'settlementType',
        locality: 'locality',
        stateName: 'stateName',
        municipalityName: 'municipality',
      },
      // 🔹 Filtros exactos
      equals: {
        zipCode: 'zipCode',
        zoneType: 'zoneType',
      },
      // 🔹 Búsqueda global
      orSearch: [
        'zipCode',
        'settlement',
        'settlementType',
        'municipality',
        'stateName',
        'locality',
      ],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewZipCodeFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: [{ zipCode: 'asc' }, { settlement: 'asc' }],
    };

    // 🔹 Ejecutar helper centralizado
    return await httpRequestFindMany<T>({
      serviceName: ZipCodesService.name,
      model: this.prisma.viewZipCode,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
 ✏️ UPDATE ZIP CODE (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Actualiza un código postal siguiendo el patrón estándar del sistema.
============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateZipCodeDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 🔹 1. Transformar relaciones
    // Eliminar updatedBy antes de transformar
    const {
      updatedBy, // ← extraemos
      ...dataWithoutExtras
    } = data as unknown as Record<string, unknown>;

    const relationalData = transformRelationIds(dataWithoutExtras);

    // 🔹 2. Construir data final
    const dataToUpdate = {
      ...relationalData,
      users_zip_codes_updated_byTousers: { connect: { id: userId } }, // ← nombre de relación de ZipCode
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de código postal',
    );

    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: ZipCodesService.name,
      model: client.zipCode,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }
}
