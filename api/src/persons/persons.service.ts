import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PaginationDto, SearchDto } from '@/common/dtos';
import {
  buildWhereMany,
  buildWherePlain,
  extractCreateParams,
  extractDataFromCURP,
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
  CreateManyPersonDto,
  CreatePersonDto,
  QueryPersonDto,
  UpdatePersonDto,
} from './dto';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}
  /* ============================================================
   👤 CREATE PERSON (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea una persona utilizando:
   - CURP como fuente de verdad
   - Municipio obligatorio → estado derivado
   - RFC generado automáticamente (real o temporal)
   - Auditoría y soporte para transacciones
   ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreatePersonDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { curp: data.curp, createdBy: userId },
      'Iniciando creación de persona',
    );

    // 🔹 2. Extraer datos desde CURP
    const curpData = extractDataFromCURP(data.curp);

    const gender = data.gender ?? curpData.gender;
    const birthDate = data.birthDate ?? curpData.birthDate;
    const nationality = data.nationality ?? curpData.nationality;

    // 🔹 3. Validar municipio y obtener estado (o derivar desde CURP)
    let stateId: number;

    if (data.municipalityId) {
      const municipality = await client.municipality.findUnique({
        where: { id: data.municipalityId },
        select: { stateId: true },
      });

      if (!municipality) {
        throw new BadRequestException(
          `El municipio con ID ${data.municipalityId} no existe.`,
        );
      }

      stateId = municipality.stateId;
    } else {
      const state = await client.state.findUnique({
        where: { code: curpData.stateCode.toUpperCase() },
        select: { id: true },
      });

      if (!state) {
        throw new BadRequestException(
          `El estado derivado de la CURP (${curpData.stateCode}) no es válido en el catálogo.`,
        );
      }

      stateId = state.id;
    }

    // 🔹 4. Construcción de RFC
    let rfc: string | null = null;
    if (data.homoclave) {
      const baseRFC = data.curp.substring(0, 10).toUpperCase();
      rfc = `${baseRFC}${data.homoclave.toUpperCase()}`;
    }

    // 🔹 5. Preparar objeto final
    const dtoToSave = {
      curp: data.curp,
      firstName: data.firstName,
      firstLastName: data.firstLastName,
      secondLastName: data.secondLastName ?? '',
      gender,
      birthDate,
      nationality,
      stateId,
      municipalityId: data.municipalityId,
      phone: data.phone,
      personalEmail: data.email,
      rfc,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { rfc, municipalityId: data.municipalityId, stateId },
      'Datos derivados para persona',
    );

    // 🔹 6. Crear registro
    return await httpRequestCreate<typeof dtoToSave, T>({
      serviceName: PersonsService.name,
      methodName: 'create',
      model: client.person,
      logger: this.logger,
      data: dtoToSave,
      returnData,
    });
  }

  /* ============================================================
 🆕 CREATE MANY PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Crea múltiples personas en una sola operación (bulk insert).

 - Usa CURP como fuente de verdad
 - Deriva género, fecha y nacionalidad
 - Genera RFC automáticamente
 - Municipio obligatorio → estado derivado
 - Mantiene auditoría
============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyPersonDto>,
  ): Promise<ApiResponse<void>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client } = extractCreateParams(params, this.prisma);

    this.logger.info(
      { total: data.persons.length, createdBy: userId },
      'Iniciando creación masiva de personas',
    );

    // 🔹 2. Preparar datos
    const preparedData = await Promise.all(
      data.persons.map(async (person) => {
        // 👉 CURP → datos derivados
        const curpData = extractDataFromCURP(person.curp);

        const gender = person.gender ?? curpData.gender;
        const birthDate = person.birthDate ?? curpData.birthDate;
        const nationality = person.nationality ?? curpData.nationality;

        // 👉 Municipio → Estado (o derivar desde CURP)
        let stateId: number;

        if (person.municipalityId) {
          const municipality = await client.municipality.findUnique({
            where: { id: person.municipalityId },
            select: { stateId: true },
          });

          if (!municipality) {
            throw new BadRequestException(
              `El municipio con ID ${person.municipalityId} no existe.`,
            );
          }

          stateId = municipality.stateId;
        } else {
          const state = await client.state.findUnique({
            where: { code: curpData.stateCode.toUpperCase() },
            select: { id: true },
          });

          if (!state) {
            throw new BadRequestException(
              `El estado derivado de la CURP (${curpData.stateCode}) no es válido en el catálogo.`,
            );
          }

          stateId = state.id;
        }

        // 👉 RFC
        let rfc: string | null = null;
        if (person.homoclave) {
          const baseRFC = person.curp.substring(0, 10).toUpperCase();
          rfc = `${baseRFC}${person.homoclave.toUpperCase()}`;
        }

        return {
          curp: person.curp,
          firstName: person.firstName,
          firstLastName: person.firstLastName,
          secondLastName: person.secondLastName ?? '',
          gender,
          birthDate,
          nationality,
          stateId,
          municipalityId: person.municipalityId,
          phone: person.phone,
          personalEmail: person.email,
          rfc,
          createdBy: userId,
          updatedBy: userId,
        };
      }),
    );

    // 🔹 3. Inserción masiva
    return await httpRequestCreateMany({
      serviceName: PersonsService.name,
      model: client.person,
      logger: this.logger,
      data: preparedData,
    });
  }

  /* ============================================================
 📋 FIND ALL PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Obtiene un listado de personas desde la vista 'ViewPersons'.

 - Usa paginación segura
 - Respuesta estandarizada
 - No requiere mapper (la vista ya entrega datos limpios)
 - El interceptor global transforma BigInt y fechas
============================================================ */
  async findAll<T>(paginationDto: PaginationDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(paginationDto);

    // 🔹 2. Construcción de query
    const queryOptions: Prisma.ViewPersonFindManyArgs = {
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
      serviceName: PersonsService.name,
      model: this.prisma.viewPerson, // 🔥 lectura desde vista
      logger: this.logger,
      queryOptions,
      dto: paginationDto,
    });
  }

  /* ============================================================
 🔍 FIND ONE PERSON BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Busca una persona en la vista 'viewPersons' utilizando
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
    const fieldMaps: TypeWhereFieldMap[] = [
      { type: 'id', field: 'id' },
      { type: 'curp', field: 'curp' },
      { type: 'email', field: 'personalEmail' },
    ];

    // 🔹 4. Construcción WHERE
    const whereCondition = buildWherePlain(type, value, fieldMaps);

    const isLight = params.options?.light === true;
    const model = isLight ? client.person : client.viewPerson;

    const queryOptions: any = {
      where: whereCondition,
    };

    if (isLight) {
      queryOptions.select = {
        id: true,
        curp: true,
        firstName: true,
        firstLastName: true,
        secondLastName: true,
        gender: true,
        birthDate: true,
        nationality: true,
        stateId: true,
        municipalityId: true,
        phone: true,
        personalEmail: true,
        rfc: true,
        states: {
          select: {
            name: true,
          },
        },
        municipalities: {
          select: {
            municipality: true,
          },
        },
      };
    }

    const result = await httpRequestFindUnique<any>({
      serviceName: PersonsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const person = result.data;
      result.data = {
        id: person.id,
        curp: person.curp,
        firstName: person.firstName,
        firstLastName: person.firstLastName,
        secondLastName: person.secondLastName,
        gender: person.gender,
        birthDate: person.birthDate,
        nationality: person.nationality,
        stateId: person.stateId,
        municipalityId: person.municipalityId,
        phone: person.phone,
        personalEmail: person.personalEmail,
        rfc: person.rfc,
        stateName: person.states?.name ?? null,
        municipalityName: person.municipalities?.municipality ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }
  /* ============================================================
 📋 FIND MANY PERSONS (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Listado de personas con filtros dinámicos (sin IDs de ubicación).
============================================================ */

  async findMany<T>(filters: QueryPersonDto): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción automática
    const whereCondition = buildWhereMany<
      Prisma.ViewPersonWhereInput,
      QueryPersonDto
    >(filters, {
      contains: {
        firstName: 'firstName',
        firstLastName: 'firstLastName',
        secondLastName: 'secondLastName',
        stateName: 'birthState',
        municipalityName: 'birthMunicipality',
        fullName: 'fullName',
      },
      equals: {
        curp: 'curp', // ← búsqueda exacta ✅
      },
      orSearch: ['fullName', 'curp', 'personalEmail'],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewPersonFindManyArgs = {
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
      serviceName: PersonsService.name,
      model: this.prisma.viewPerson,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
 ✏️ UPDATE PERSON (SICES V3)
 ------------------------------------------------------------
 📌 Descripción:
 Actualiza una persona siguiendo el patrón estándar del sistema.
 Integra lógica de CURP para recalcular datos demográficos.
============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdatePersonDto>,
  ): Promise<ApiResponse<R>> {
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    const extraData: Record<string, unknown> = {};

    // 🔹 1. Validar municipio y derivar stateId
    if (data.municipalityId) {
      const municipality = await client.municipality.findUnique({
        where: { id: data.municipalityId },
        select: { stateId: true },
      });

      if (!municipality) {
        throw new BadRequestException(
          `El municipio con ID ${data.municipalityId} no existe.`,
        );
      }

      // ✅ Directo como relación, no como escalar
      extraData.states = { connect: { id: municipality.stateId } };
    }

    // 🔹 2. Recalcular datos demográficos si viene CURP
    if (data.curp) {
      const { gender, birthDate, nationality } = extractDataFromCURP(data.curp);
      Object.assign(extraData, { gender, birthDate, nationality });
    }

    // 🔹 3. Recalcular RFC si viene curp u homoclave
    if (data.curp || data.homoclave) {
      const personRecord = await client.person.findUnique({
        where: { id: Number(idValue) },
        select: { curp: true, rfc: true },
      });

      const curp = data.curp ?? personRecord?.curp;

      // Extraemos la homoclave del RFC existente (los últimos 3 caracteres si mide 13)
      const existingHomoclave =
        personRecord?.rfc && personRecord.rfc.length === 13
          ? personRecord.rfc.substring(10)
          : null;

      const homoclave = data.homoclave?.toUpperCase() ?? existingHomoclave;

      if (curp && homoclave) {
        const baseRFC = curp.substring(0, 10).toUpperCase();
        extraData.rfc = `${baseRFC}${homoclave}`;
      } else {
        extraData.rfc = null;
      }
    }

    // 🔹 4. Eliminar homoclave (no existe en schema), updatedBy y transformar relaciones
    const { homoclave, updatedBy, email, ...dataWithoutHomoclave } =
      data as unknown as Record<string, unknown>;

    // Renombramos 'email' a 'personalEmail' para que coincida con el schema de Prisma
    const dataToTransform = {
      ...dataWithoutHomoclave,
      ...(email !== undefined && { personalEmail: email }),
    };

    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 5. Construir data final
    // extraData sobreescribe relationalData en caso de conflicto
    // (ej: states derivado del municipio tiene prioridad sobre stateId del DTO)
    const dataToUpdate = {
      ...relationalData,
      ...extraData,
      users_persons_updated_byTousers: { connect: { id: userId } }, // ← directo aquí
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de persona',
    );

    return await httpRequestUpdate<typeof dataToUpdate, R>({
      serviceName: PersonsService.name,
      model: client.person,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData,
      idFieldName,
    });
  }
}
