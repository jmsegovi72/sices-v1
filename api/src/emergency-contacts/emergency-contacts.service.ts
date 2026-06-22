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
  CreateEmergencyContactDto,
  CreateManyEmergencyContactDto,
  QueryEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto';

@Injectable()
export class EmergencyContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}
  /* ============================================================
    📞 CREATE EMERGENCY CONTACT (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Crea un contacto de emergencia siguiendo el patrón estándar.
    ============================================================ */
  async create<T>(
    params: CreateEntityParams<CreateEmergencyContactDto>,
  ): Promise<ApiResponse<T>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client, returnData } = extractCreateParams(
      params,
      this.prisma,
    );

    this.logger.info(
      { personId: data.personId, createdBy: userId },
      'Iniciando creación de contacto de emergencia',
    );

    // 🔹 2. Preparar objeto final (Mapeado al modelo Prisma)
    const dtoToSave = {
      personId: data.personId,
      fullName: data.fullName,
      phone: data.phone,
      relationshipId: data.relationshipId,
      createdBy: userId,
      updatedBy: userId,
    };

    this.logger.debug(
      { personId: data.personId, relationshipId: data.relationshipId },
      'Datos para creación de contacto de emergencia',
    );

    // 🔹 3. Crear registro mediante httpRequestCreate
    const result = await httpRequestCreate<typeof dtoToSave, any>({
      serviceName: EmergencyContactsService.name,
      methodName: 'create',
      model: client.emergencyContact, // Nombre del modelo en Prisma
      logger: this.logger,
      data: dtoToSave,
      returnData: true, // Forzar la obtención del ID para la vista
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewEmergencyContact.findUnique({
        where: { id: result.data.id },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }
  /* ============================================================
   📞 CREATE MANY CONTACTS (SICES V3)
   ------------------------------------------------------------
   📌 Descripción:
   Crea múltiples contactos en una sola operación (bulk insert).
   ============================================================ */
  async createMany(
    params: CreateEntityParams<CreateManyEmergencyContactDto>,
  ): Promise<ApiResponse<void>> {
    // 🔹 1. Extracción estándar
    const { userId, data, client } = extractCreateParams(params, this.prisma);

    // 🔹 CORRECCIÓN: Usar data.emergencyContacts en lugar de data.contacts
    this.logger.info(
      { total: data.emergencyContacts.length, createdBy: userId },
      'Iniciando creación masiva de contactos de emergencia',
    );

    // 🔹 2. Preparar datos
    const preparedData = data.emergencyContacts.map((contact) => ({
      personId: contact.personId,
      fullName: contact.fullName,
      phone: contact.phone,
      relationshipId: contact.relationshipId,
      createdBy: userId,
      updatedBy: userId,
    }));

    // 🔹 3. Inserción masiva
    return await httpRequestCreateMany({
      serviceName: EmergencyContactsService.name,
      model: client.emergencyContact,
      logger: this.logger,
      data: preparedData,
    });
  }

  /* ============================================================
    📞 FIND MANY EMERGENCY CONTACTS (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Listado de contactos con búsqueda por término general.
    ============================================================ */

  async findMany<T>(
    filters: QueryEmergencyContactDto,
  ): Promise<ApiResponse<T[]>> {
    // 🔹 Resolver paginación segura
    const pagination = resolvePagination(filters);

    // 🤖 Construcción automática
    const whereCondition = buildWhereMany<
      Prisma.ViewEmergencyContactWhereInput,
      QueryEmergencyContactDto
    >(filters, {
      orSearch: ['personName'],
    });

    // 🔹 Query Prisma
    const queryOptions: Prisma.ViewEmergencyContactFindManyArgs = {
      ...(pagination.limit > 0 && {
        take: pagination.limit,
        skip: pagination.offset,
      }),

      where: whereCondition,

      orderBy: {
        personName: 'asc',
      },
    };

    // 🔹 Helper centralizado
    return await httpRequestFindMany<T>({
      serviceName: EmergencyContactsService.name,
      model: this.prisma.viewEmergencyContact,
      logger: this.logger,
      queryOptions,
      dto: filters,
    });
  }

  /* ============================================================
    📞 FIND ONE BY (SICES V3 - UNIQUE)
    ------------------------------------------------------------
    📌 Descripción:
    Busca un contacto específico utilizando campos @unique de 
    la vista, garantizando atomicidad y rendimiento.
    ============================================================ */
  async findOneBy<T>(
    params: FindEntityParams<SearchDto>,
  ): Promise<ApiResponse<T | null>> {
    // 🔹 1. Extracción con la utilidad simétrica
    const { searchDto, client, throwIfNotFound } = extractFindParams(
      params,
      this.prisma,
    );

    // 🔹 2. Validación de seguridad para el objeto search
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
    const model = isLight ? client.emergencyContact : client.viewEmergencyContact;

    // 🔹 3. Construcción del WHERE plano
    let whereCondition: any;
    if (isLight) {
      if (type === 'curp') {
        const person = await client.person.findUnique({
          where: { curp: String(value) },
          select: { id: true },
        });
        if (!person) {
          if (throwIfNotFound) {
            throw new NotFoundException(`No se encontró la persona con CURP ${value}`);
          }
          return qwikMessageResponse({
            success: true,
            message: 'Registro no encontrado.',
            data: null,
          });
        }
        const contact = await client.emergencyContact.findFirst({
          where: { personId: person.id },
          select: { id: true },
        });
        if (!contact) {
          if (throwIfNotFound) {
            throw new NotFoundException(`No se encontró el contacto de emergencia de la persona con CURP ${value}`);
          }
          return qwikMessageResponse({
            success: true,
            message: 'Registro no encontrado.',
            data: null,
          });
        }
        whereCondition = { id: contact.id };
      } else if (type === 'id') {
        // Primero intentamos buscar por ID de contacto
        const contactById = await client.emergencyContact.findUnique({
          where: { id: Number(value) },
          select: { id: true },
        });
        if (contactById) {
          whereCondition = { id: contactById.id };
        } else {
          // Si no, intentamos por personId
          const contactByPersonId = await client.emergencyContact.findFirst({
            where: { personId: Number(value) },
            select: { id: true },
          });
          if (contactByPersonId) {
            whereCondition = { id: contactByPersonId.id };
          } else {
            if (throwIfNotFound) {
              throw new NotFoundException(`No se encontró el contacto de emergencia con ID o personId ${value}`);
            }
            return qwikMessageResponse({
              success: true,
              message: 'Registro no encontrado.',
              data: null,
            });
          }
        }
      } else {
        whereCondition = buildWherePlain(type, value, [{ type: 'id', field: 'id' }]);
      }
    } else {
      const fieldMaps: TypeWhereFieldMap[] = [
        { type: 'id', field: 'id' },
        { type: 'id', field: 'personId' },
        { type: 'curp', field: 'personCurp' },
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
        fullName: true,
        phone: true,
        relationshipId: true,
        persons: {
          select: {
            curp: true,
            firstName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        contact_relationships: {
          select: {
            name: true,
          },
        },
      };
    }

    // 🔹 5. Ejecución mediante la utilidad FindUnique
    const result = await httpRequestFindUnique<any>({
      serviceName: EmergencyContactsService.name,
      model,
      logger: this.logger,
      searchDto,
      queryOptions,
      searchField: type,
      searchValue: value,
      throwIfNotFound,
    });

    if (isLight && result?.data) {
      const contact = result.data;
      const person = contact.persons ?? {};
      result.data = {
        id: contact.id,
        personId: contact.personId,
        personCurp: person.curp ?? null,
        personName: person.firstName
          ? `${person.firstName} ${person.firstLastName} ${person.secondLastName || ''}`.trim()
          : null,
        contactName: contact.fullName,
        contactPhone: contact.phone,
        relationship: contact.contact_relationships?.name ?? null,
      };
    }

    return result as ApiResponse<T | null>;
  }

  /* ============================================================
    📞 UPDATE EMERGENCY CONTACT (SICES V3)
    ------------------------------------------------------------
    📌 Descripción:
    Actualiza un contacto de emergencia mapeando relaciones de 
    Prisma y auditoría de usuario.
    ============================================================ */
  async update<R = any>(
    params: UpdateEntityParams<UpdateEmergencyContactDto>,
  ): Promise<ApiResponse<R>> {
    // 🔹 1. Extracción estándar de parámetros
    const { idValue, data, client, returnData, idFieldName, userId } =
      extractUpdateParams(params, this.prisma);

    // 🔹 2. Separar auditoría manual y transformar IDs de relación
    // Extraemos 'updatedBy' si viene en el DTO para no duplicarlo con la relación connect
    const { updatedBy, ...dataToTransform } = data as unknown as Record<
      string,
      unknown
    >;

    // Transforma campos como 'relationshipId' en { contact_relationships: { connect: { id: ... } } }
    const relationalData = transformRelationIds(dataToTransform);

    // 🔹 3. Construir objeto final para Prisma
    const dataToUpdate = {
      ...relationalData,
      // Conexión obligatoria con el usuario que actualiza (Auditoría)
      users_emergency_contacts_updated_byTousers: {
        connect: { id: userId },
      },
    };

    this.logger.debug(
      { idValue, dataToUpdate },
      'Datos finales para actualización de contacto de emergencia',
    );

    // 🔹 4. Ejecución mediante la utilidad estandarizada
    const result = await httpRequestUpdate<typeof dataToUpdate, any>({
      serviceName: EmergencyContactsService.name,
      model: client.emergencyContact,
      logger: this.logger,
      idValue,
      data: dataToUpdate,
      returnData: true, // Forzar la obtención del ID para la vista
      idFieldName,
    });

    if (result.success && returnData) {
      const viewData = await this.prisma.viewEmergencyContact.findUnique({
        where: { id: Number(idValue) },
      });
      result.data = viewData;
    } else if (!returnData) {
      delete result.data;
    }

    return result;
  }
}
