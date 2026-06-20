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
import { PrismaService } from '@/prisma';
import {
  CreateAddressDto,
  CreateManyAddressDto,
  QueryAddressDto,
  UpdateAddressDto,
} from './dto';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}
  /* ============================================================
   🏠 CREATE ADDRESS (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea una dirección siguiendo el patrón estándar del sistema.
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateAddressDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { personId: data.personId, createdBy: userId },
      'Iniciando creación de dirección',
    );

    // 🔹 2. Preparar objeto final
    const dtoToSave = {
      streetTypeId: data.streetTypeId,
      street: data.street,
      exteriorNumber: data.exteriorNumber ?? '',
      interiorNumber: data.interiorNumber ?? '',
      block: data.block ?? '',
      betweenStreets: data.betweenStreets ?? '',
      personId: data.personId,
      zipCodeId: data.zipCodeId,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { personId: data.personId, zipCodeId: data.zipCodeId },
      'Datos para creación de dirección',
    );

    // 🔹 3. Crear registro
    const result = await httpRequestCreate<typeof dtoToSave, any>({
      serviceName: AddressesService.name,
      methodName: 'create',
      model: client.address,
      logger: this.logger,
      data: dtoToSave,
      returnData: true, // Forzar la obtención del ID para la vista
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewAddress.findUnique({
        where: { id: result.data.id },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }
  /* ============================================================
 🆕 CREATE MANY ADDRESSES (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Crea múltiples direcciones en una sola operación (bulk insert).
 - Mantiene auditoría
============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyAddressDto>,
  ): Promise<ApiResponse<void>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client } = extractCreateParams(params, this.prisma);

    this.logger.info(
      { total: data.addresses.length, createdBy: userId },
      'Iniciando creación masiva de direcciones',
    );

    // 🔹 2. Preparar datos
    const preparedData = data.addresses.map((address) => ({
      streetTypeId: address.streetTypeId,
      street: address.street,
      exteriorNumber: address.exteriorNumber ?? '',
      interiorNumber: address.interiorNumber ?? '',
      block: address.block ?? '',
      betweenStreets: address.betweenStreets ?? '',
      personId: address.personId,
      zipCodeId: address.zipCodeId,
      createdBy: userId,
      updatedBy: userId,
    }));

    // 🔹 3. Inserción masiva
    return await httpRequestCreateMany({
      serviceName: AddressesService.name,
      model: client.address,
      logger: this.logger,
      data: preparedData,
    });
  }

  /* ============================================================
 📋 FIND ALL ADDRESSES (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Obtiene un listado de direcciones desde la vista 'ViewAddress'.
 - Usa paginación segura
 - Respuesta estandarizada
 - No requiere mapper (la vista ya entrega datos limpios)
============================================================ */
  async findAll<T>(paginationDto: QueryAddressDto): Promise<ApiResponse<T[]>> {
    // 🔹 1. Extraer paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewAddressFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: {},
      orderBy: {
        fullName: 'asc',
      },
    };

    // 🔹 3. Ejecutar helper genérico
    return await httpRequestFindMany<T>({
      serviceName: AddressesService.name,
      model: this.prisma.viewAddress,
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
 🔍 FIND ONE ADDRESS BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Busca una dirección en la vista 'ViewAddress' utilizando
 detección automática del SearchDto.
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
    const model = isLight ? client.address : client.viewAddress;

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
            throw new NotFoundException(`No se encontró la dirección de la persona con CURP ${value}`);
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
        streetTypeId: true,
        street: true,
        exteriorNumber: true,
        interiorNumber: true,
        block: true,
        betweenStreets: true,
        personId: true,
        zipCodeId: true,
        persons: {
          select: {
            curp: true,
            firstName: true,
            firstLastName: true,
            secondLastName: true,
            fullName: true,
          },
        },
        street_types: {
          select: {
            abbreviation: true,
          },
        },
        zip_codes: {
          select: {
            zipCode: true,
            settlement: true,
            locality: true,
            settlement_types: {
              select: {
                settlementType: true,
              },
            },
            municipalities: {
              select: {
                id: true,
                municipality: true,
                municipalCapital: true,
                states: {
                  select: {
                    id: true,
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
      serviceName: AddressesService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const address = result.data;
      const person = address.persons ?? {};
      const zip = address.zip_codes ?? {};
      const municipality = zip.municipalities ?? {};
      const state = municipality.states ?? {};

      const streetTypeStr = address.street_types?.abbreviation ?? '';
      const streetStr = address.street ?? '';
      const extNumStr = address.exteriorNumber ? `No. ${address.exteriorNumber}` : '';
      const intNumStr = address.interiorNumber ? `Int. ${address.interiorNumber}` : '';
      const blockStr = address.block ? `Manzana ${address.block}` : '';
      const settlementStr = zip.settlement ?? '';
      const zipCodeStr = zip.zipCode ?? '';
      const municipalityStr = municipality.municipality ?? '';
      const stateStr = state.name ?? '';

      const fullAddressParts = [
        [streetTypeStr, streetStr, extNumStr, intNumStr, blockStr].filter(Boolean).join(' '),
        settlementStr,
        zipCodeStr ? `C.P. ${zipCodeStr}` : '',
        municipalityStr,
        stateStr
      ].filter(Boolean);
      const fullAddress = fullAddressParts.join(', ');

      result.data = {
        id: address.id,
        streetTypeId: address.streetTypeId,
        streetType: streetTypeStr,
        street: address.street,
        exteriorNumber: address.exteriorNumber,
        interiorNumber: address.interiorNumber,
        block: address.block,
        betweenStreets: address.betweenStreets,
        personId: address.personId,
        zipCodeId: address.zipCodeId,
        curp: person.curp ?? null,
        fullName: person.fullName ?? null,
        zipCode: zipCodeStr,
        settlement: settlementStr,
        settlementType: zip.settlement_types?.settlementType ?? null,
        locality: zip.locality ?? null,
        municipalityName: municipalityStr,
        municipalCapital: municipality.municipalCapital ?? null,
        municipalityId: municipality.id ?? null,
        stateId: state.id ?? null,
        stateName: stateStr,
        fullAddress,
      };
    }

    return result as ApiResponse<T | null>;
  }
  /* ============================================================
  📋 FIND MANY ADDRESSES (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Listado de direcciones con filtros geográficos por nombre y
  búsqueda operativa por calle/asentamiento.
  ============================================================ */
  async findMany<T>(filters: QueryAddressDto): Promise<ApiResponse<T[]>> {
    const pagination = resolvePagination(filters);
    const whereCondition = buildWhereMany<
      Prisma.ViewAddressWhereInput,
      QueryAddressDto
    >(filters, {
      contains: {
        street: 'street',
        settlement: 'settlement',
        stateName: 'stateName',
        municipalityName: 'municipalityName',
        zipCode: 'zipCode',
      },

      orSearch: ['street', 'settlement', 'zipCode', 'fullName'],
    });

    const queryOptions: Prisma.ViewAddressFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),
      where: whereCondition,
      orderBy: { street: 'asc' },
    };

    return await httpRequestFindMany<T>({
      serviceName: AddressesService.name,
      model: this.prisma.viewAddress, // 👈 Usando la vista
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
  ✏️ UPDATE ADDRESS (SICES V3)
  ------------------------------------------------------------
  📌 Descripción:
  Actualiza una dirección utilizando el helper de transformación
  para manejar relaciones (streetTypeId, zipCodeId, personId) 
  y la auditoría requerida por Prisma 7.
  ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateAddressDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 🔹 1. Extraer updatedBy para manejarlo manualmente vía relación
    // Al estar en EXCLUDE_FROM_TRANSFORM, el helper lo ignoraría,
    // pero lo sacamos aquí para limpieza absoluta.
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    // 🔹 2. Transformar IDs escalares a objetos connect
    // Convierte: streetTypeId, zipCodeId y personId
    // Elimina: las llaves originales para evitar "Unknown argument"
    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 3. Construir objeto final de actualización
    const dataToUpdate: Record<string, any> = {
      ...relationalData,
      // Nombre exacto de la relación en tu modelo Address
      users_addresses_updated_byTousers: { connect: { id: userId } },
    };

    const optionalFields = ['exteriorNumber', 'interiorNumber', 'block', 'betweenStreets'];
    for (const field of optionalFields) {
      if (dataToUpdate[field] === null) {
        dataToUpdate[field] = '';
      }
    }

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de dirección (SICES V3)',
    );

    // 🔹 4. Actualizar registro
    const result = await httpRequestUpdate<typeof dataToUpdate, any>({
      serviceName: AddressesService.name,
      model: client.address,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData: true, // Forzar la obtención del ID para la vista
      idFieldName,
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewAddress.findUnique({
        where: { id: Number(idValue) },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }
}
