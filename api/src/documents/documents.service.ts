import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { UploadsService } from '@/uploads/uploads.service';
import { UploadDocumentDto, UpdateDocumentDto, UploadDocumentBulkDto } from './dto';
import { qwikMessageResponse } from '@/common/helpers';
import type { UserFromView } from '@/common/types';
import slugify from 'slugify';
import * as fs from 'fs';
import { join, basename } from 'path';
import type { Response } from 'express';

// 📂 Mapa de tipos MIME permitidos y sus extensiones amigables
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/json': '.json',
  'application/xml': '.xml',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly uploadsService: UploadsService,
  ) {}

  /* ============================================================
     📥 UPLOAD / UPSERT DOCUMENT
     ------------------------------------------------------------
     📌 Sube un archivo para una persona (e id contextual opcional).
     Si ya existe un archivo del mismo tipo para la persona,
     reemplaza el archivo físico y actualiza el metadato.
     ============================================================ */
  async uploadDocument(
    dto: UploadDocumentDto,
    file: any,
    currentUser: UserFromView,
  ) {
    const { personId, studentId, staffId, documentTypeId, deliveryDate, notes } = dto;

    this.logger.info(
      { personId, documentTypeId, updatedBy: currentUser.id },
      'Iniciando carga de documento general'
    );

    // 1. Validar que el archivo exista
    if (!file) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'No se proporcionó ningún archivo para la carga.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 2. Validar que el tipo MIME esté permitido
    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: `El tipo de archivo (${file.mimetype}) no está permitido.`,
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 3. Validar si la persona existe y obtener su CURP
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `La persona con ID ${personId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const curp = person.curp?.trim()?.toUpperCase();
    if (!curp) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'La persona seleccionada no cuenta con una CURP registrada en su expediente.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 4. Validaciones contextuales opcionales
    if (studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `El registro de estudiante con ID ${studentId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }
      if (student.personId !== personId) {
        throw new BadRequestException(
          qwikMessageResponse({
            success: false,
            message: `El estudiante con ID ${studentId} no pertenece a la persona seleccionada (ID ${personId}).`,
            errorCode: 'BAD_REQUEST',
          }),
        );
      }
    }

    if (staffId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId },
      });
      if (!staff) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `El registro de personal con ID ${staffId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }
      if (staff.personId !== personId) {
        throw new BadRequestException(
          qwikMessageResponse({
            success: false,
            message: `El miembro de personal con ID ${staffId} no pertenece a la persona seleccionada (ID ${personId}).`,
            errorCode: 'BAD_REQUEST',
          }),
        );
      }
    }

    // 5. Validar que el tipo de documento exista en el catálogo
    const docType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!docType) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: `El tipo de documento con ID ${documentTypeId} no existe en el catálogo.`,
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 6. Generar nombre de archivo: [CURP]-[tipo-documento-slug].[extension]
    const docTypeSlug = slugify(docType.name, { lower: true, strict: true });
    const filename = `${curp}-${docTypeSlug}${extension}`;

    // 7. Guardar el archivo físico en la subcarpeta 'documents'
    const relativePath = await this.uploadsService.saveFile(
      file,
      'documents',
      filename,
      Object.keys(ALLOWED_MIME_TYPES),
      20, // Aumentado a 20MB para admitir archivos más grandes (.zip, etc.)
    );

    // 8. Buscar si ya existe un registro de este tipo para la persona
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        personId,
        documentTypeId,
      },
    });

    let savedDocument: any;

    if (existingDoc) {
      // Reemplazo: Eliminar archivo anterior si la ruta física es distinta
      if (existingDoc.filePath && existingDoc.filePath !== relativePath) {
        const oldPhysicalPath = join(process.cwd(), existingDoc.filePath);
        if (fs.existsSync(oldPhysicalPath)) {
          try {
            fs.unlinkSync(oldPhysicalPath);
          } catch (error: any) {
            this.logger.warn(
              { path: oldPhysicalPath, error: error.message },
              'No se pudo eliminar el archivo físico anterior durante la sobreescritura general',
            );
          }
        }
      }

      // Actualizar registro
      savedDocument = await this.prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          studentId: studentId ?? null,
          staffId: staffId ?? null,
          filePath: relativePath,
          mimeType: file.mimetype,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          notes: notes ?? null,
          updatedBy: currentUser.id,
        },
      });

      this.logger.info(
        { documentId: savedDocument.id, personId, documentTypeId },
        'Documento reemplazado exitosamente en base de datos'
      );
    } else {
      // Crear nuevo registro
      savedDocument = await this.prisma.document.create({
        data: {
          personId,
          studentId: studentId ?? null,
          staffId: staffId ?? null,
          documentTypeId,
          filePath: relativePath,
          mimeType: file.mimetype,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          notes: notes ?? null,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        },
      });

      this.logger.info(
        { documentId: savedDocument.id, personId, documentTypeId },
        'Documento creado exitosamente en base de datos'
      );
    }

    return qwikMessageResponse({
      success: true,
      message: existingDoc
        ? 'El documento ha sido reemplazado correctamente.'
        : 'El documento ha sido cargado correctamente.',
      data: savedDocument,
    });
  }

  /* ============================================================
     📋 FIND ALL DOCUMENTS BY PERSON
     ------------------------------------------------------------
     📌 Retorna todos los documentos asociados a una persona (sin importar rol).
     ============================================================ */
  async findByPerson(personId: number) {
    this.logger.info({ personId }, 'Buscando documentos de la persona');

    const documents = await this.prisma.viewDocument.findMany({
      where: { personId },
      orderBy: { deliveryDate: 'desc' },
    });

    return qwikMessageResponse({
      success: true,
      message: 'Documentos de la persona recuperados correctamente.',
      data: documents,
    });
  }

  /* ============================================================
     📋 FIND ALL DOCUMENTS BY STUDENT CONTEXT
     ------------------------------------------------------------
     📌 Retorna los documentos cargados en su rol de estudiante.
     ============================================================ */
  async findByStudent(studentId: number) {
    this.logger.info({ studentId }, 'Buscando documentos del estudiante');

    const documents = await this.prisma.viewDocument.findMany({
      where: { studentId },
      orderBy: { deliveryDate: 'desc' },
    });

    return qwikMessageResponse({
      success: true,
      message: 'Documentos del estudiante recuperados correctamente.',
      data: documents,
    });
  }

  /* ============================================================
     📋 FIND ALL DOCUMENTS BY STAFF CONTEXT
     ------------------------------------------------------------
     📌 Retorna los documentos cargados en su rol de docente/administrativo.
     ============================================================ */
  async findByStaff(staffId: number) {
    this.logger.info({ staffId }, 'Buscando documentos del miembro de personal');

    const documents = await this.prisma.viewDocument.findMany({
      where: { staffIdRef: staffId },
      orderBy: { deliveryDate: 'desc' },
    });

    return qwikMessageResponse({
      success: true,
      message: 'Documentos del personal recuperados correctamente.',
      data: documents,
    });
  }

  /* ============================================================
     🔍 FIND ONE DOCUMENT BY ID
     ------------------------------------------------------------
     📌 Obtiene metadatos enriquecidos de un documento por su ID.
     ============================================================ */
  async findOne(id: number) {
    this.logger.info({ documentId: id }, 'Buscando detalle de documento');

    const document = await this.prisma.viewDocument.findFirst({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El registro de documento con ID ${id} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    return qwikMessageResponse({
      success: true,
      message: 'Detalle del documento recuperado correctamente.',
      data: document,
    });
  }

  /* ============================================================
     ✏️ UPDATE DOCUMENT METADATA
     ------------------------------------------------------------
     📌 Modifica campos opcionales sin alterar el archivo físico.
     ============================================================ */
  async updateMetadata(
    id: number,
    dto: UpdateDocumentDto,
    currentUser: UserFromView,
  ) {
    this.logger.info(
      { documentId: id, updatedBy: currentUser.id },
      'Iniciando actualización de metadatos de documento'
    );

    const doc = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El documento con ID ${id} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // Validaciones de llaves foráneas opcionales si se envían
    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
      if (!student) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `El registro de estudiante con ID ${dto.studentId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }
      if (student.personId !== doc.personId) {
        throw new BadRequestException(
          qwikMessageResponse({
            success: false,
            message: `El estudiante con ID ${dto.studentId} no pertenece a la persona asociada al documento (ID ${doc.personId}).`,
            errorCode: 'BAD_REQUEST',
          }),
        );
      }
    }

    if (dto.staffId) {
      const staff = await this.prisma.staff.findUnique({ where: { id: dto.staffId } });
      if (!staff) {
        throw new NotFoundException(
          qwikMessageResponse({
            success: false,
            message: `El registro de personal con ID ${dto.staffId} no existe.`,
            errorCode: 'NOT_FOUND',
          }),
        );
      }
      if (staff.personId !== doc.personId) {
        throw new BadRequestException(
          qwikMessageResponse({
            success: false,
            message: `El miembro de personal con ID ${dto.staffId} no pertenece a la persona asociada al documento (ID ${doc.personId}).`,
            errorCode: 'BAD_REQUEST',
          }),
        );
      }
    }

    const updatedDoc = await this.prisma.document.update({
      where: { id },
      data: {
        studentId: dto.studentId !== undefined ? dto.studentId : doc.studentId,
        staffId: dto.staffId !== undefined ? dto.staffId : doc.staffId,
        notes: dto.notes !== undefined ? dto.notes : doc.notes,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : doc.deliveryDate,
        updatedBy: currentUser.id,
      },
    });

    this.logger.info(
      { documentId: id },
      'Metadatos de documento actualizados exitosamente'
    );

    return qwikMessageResponse({
      success: true,
      message: 'Metadatos del documento actualizados correctamente.',
      data: updatedDoc,
    });
  }

  /* ============================================================
     🔒 STREAM FILE SECURELY
     ------------------------------------------------------------
     📌 Transmite el archivo físico bajo autorización con tipo MIME dinámico.
     ============================================================ */
  async streamFile(id: number, res: Response): Promise<StreamableFile> {
    this.logger.info({ documentId: id }, 'Iniciando transmisión de archivo físico general');

    const doc = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!doc || !doc.filePath) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: 'El registro de documento o su archivo físico no está disponible.',
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const absolutePath = join(process.cwd(), doc.filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: 'El archivo físico no existe en el almacenamiento del servidor.',
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    // Configurar cabeceras de respuesta dinámicas
    res.set({
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${basename(absolutePath)}"`,
    });

    return new StreamableFile(fs.createReadStream(absolutePath));
  }

  /* ============================================================
     📥 POST: BULK UPLOAD OR UPSERT DOCUMENTS
     ------------------------------------------------------------
     📌 Procesa de 1 a N documentos para una persona en una sola petición.
     ============================================================ */
  async uploadDocumentsBulk(
    dto: UploadDocumentBulkDto,
    files: any[],
    currentUser: UserFromView,
  ) {
    const { personId, deliveryDate } = dto;

    this.logger.info(
      { personId, filesCount: files?.length, updatedBy: currentUser.id },
      'Iniciando carga masiva (bulk) de documentos con metadata dinámica'
    );

    // 1. Validar si la persona existe y obtener su CURP
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `La persona con ID ${personId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const curp = person.curp?.trim()?.toUpperCase();
    if (!curp) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'La persona seleccionada no cuenta con una CURP registrada en su expediente.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // Resolver fecha de entrega global
    const globalDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();

    // 2. Reconstruir la lista de documentos a partir del body plano y los archivos
    const itemsMap: Record<number, {
      documentTypeId?: number;
      studentId?: number;
      staffId?: number;
      notes?: string;
      file?: any;
    }> = {};

    // Extraer campos metadatos del body
    for (const [key, value] of Object.entries(dto)) {
      const match = key.match(/^documents\[(\d+)\]\[(\w+)\]$/);
      if (match) {
        const index = parseInt(match[1], 10);
        const field = match[2];

        if (!itemsMap[index]) {
          itemsMap[index] = {};
        }

        if (field === 'documentTypeId') {
          itemsMap[index].documentTypeId = Number(value);
        } else if (field === 'studentId') {
          itemsMap[index].studentId = value !== 'null' && value !== '' && value !== undefined && value !== null ? Number(value) : undefined;
        } else if (field === 'staffId') {
          itemsMap[index].staffId = value !== 'null' && value !== '' && value !== undefined && value !== null ? Number(value) : undefined;
        } else if (field === 'notes') {
          itemsMap[index].notes = String(value);
        }
      }
    }

    // Extraer archivos físicos correspondientes
    if (files && Array.isArray(files)) {
      for (const file of files) {
        const match = file.fieldname.match(/^documents\[(\d+)\]\[file\]$/);
        if (match) {
          const index = parseInt(match[1], 10);
          if (!itemsMap[index]) {
            itemsMap[index] = {};
          }
          itemsMap[index].file = file;
        }
      }
    }

    const items = Object.entries(itemsMap).map(([indexStr, item]) => {
      return {
        index: parseInt(indexStr, 10),
        documentTypeId: item.documentTypeId,
        studentId: item.studentId,
        staffId: item.staffId,
        notes: item.notes,
        file: item.file,
      };
    }).sort((a, b) => a.index - b.index);

    const itemsResults: any[] = [];
    let createdCount = 0;
    let replacedCount = 0;
    let failedCount = 0;

    // 3. Procesar cada item secuencialmente
    for (const item of items) {
      const { index, documentTypeId, studentId, staffId, notes, file } = item;

      try {
        // Validar campos del item
        if (!documentTypeId) {
          throw new Error('El ID del tipo de documento es obligatorio.');
        }

        if (!file) {
          throw new Error('No se proporcionó ningún archivo para este elemento.');
        }

        // Regla: No vincular a estudiante y staff al mismo tiempo
        if (studentId && staffId) {
          throw new Error('No se permite vincular el documento a un estudiante y a personal simultáneamente.');
        }

        // Regla: Validar studentId si existe
        if (studentId) {
          const student = await this.prisma.student.findUnique({
            where: { id: studentId },
          });
          if (!student) {
            throw new Error(`El registro de estudiante con ID ${studentId} no existe.`);
          }
          if (student.personId !== personId) {
            throw new Error(`El estudiante con ID ${studentId} no pertenece a la persona seleccionada (ID ${personId}).`);
          }
        }

        // Regla: Validar staffId si existe
        if (staffId) {
          const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
          });
          if (!staff) {
            throw new Error(`El registro de personal con ID ${staffId} no existe.`);
          }
          if (staff.personId !== personId) {
            throw new Error(`El miembro de personal con ID ${staffId} no pertenece a la persona seleccionada (ID ${personId}).`);
          }
        }

        const extension = ALLOWED_MIME_TYPES[file.mimetype];
        if (!extension) {
          throw new Error(`El tipo de archivo (${file.mimetype}) no está permitido.`);
        }

        const docType = await this.prisma.documentType.findUnique({
          where: { id: documentTypeId },
        });

        if (!docType) {
          throw new Error(`El tipo de documento con ID ${documentTypeId} no existe en el catálogo.`);
        }

        // Guardar archivo físico
        const docTypeSlug = slugify(docType.name, { lower: true, strict: true });
        const filename = `${curp}-${docTypeSlug}${extension}`;

        const relativePath = await this.uploadsService.saveFile(
          file,
          'documents',
          filename,
          Object.keys(ALLOWED_MIME_TYPES),
          20,
        );

        // Buscar si ya existe para Upsert
        const existingDoc = await this.prisma.document.findFirst({
          where: {
            personId,
            documentTypeId,
          },
        });

        let savedDocument: any;
        let itemStatus: 'created' | 'replaced' = 'created';

        if (existingDoc) {
          // Reemplazo: Eliminar archivo anterior si la ruta física es distinta
          if (existingDoc.filePath && existingDoc.filePath !== relativePath) {
            const oldPhysicalPath = join(process.cwd(), existingDoc.filePath);
            if (fs.existsSync(oldPhysicalPath)) {
              try {
                fs.unlinkSync(oldPhysicalPath);
              } catch (unlinkError: any) {
                this.logger.warn(
                  { path: oldPhysicalPath, error: unlinkError.message },
                  'Carga masiva: No se pudo eliminar el archivo físico anterior durante la sobreescritura',
                );
              }
            }
          }

          // Actualizar registro
          savedDocument = await this.prisma.document.update({
            where: { id: existingDoc.id },
            data: {
              studentId: studentId ?? null,
              staffId: staffId ?? null,
              filePath: relativePath,
              mimeType: file.mimetype,
              deliveryDate: globalDeliveryDate,
              notes: notes ?? null,
              updatedBy: currentUser.id,
            },
          });
          itemStatus = 'replaced';
          replacedCount++;
        } else {
          // Crear nuevo registro
          savedDocument = await this.prisma.document.create({
            data: {
              personId,
              studentId: studentId ?? null,
              staffId: staffId ?? null,
              documentTypeId,
              filePath: relativePath,
              mimeType: file.mimetype,
              deliveryDate: globalDeliveryDate,
              notes: notes ?? null,
              createdBy: currentUser.id,
              updatedBy: currentUser.id,
            },
          });
          createdCount++;
        }

        itemsResults.push({
          index,
          documentTypeId,
          status: itemStatus,
          message: itemStatus === 'replaced'
            ? 'Documento reemplazado correctamente.'
            : 'Documento cargado correctamente.',
          data: {
            id: savedDocument.id,
            filePath: savedDocument.filePath,
          },
        });
      } catch (itemError: any) {
        failedCount++;
        itemsResults.push({
          index,
          documentTypeId: documentTypeId ?? null,
          status: 'error',
          message: itemError.message || 'Error desconocido al procesar este documento.',
        });
      }
    }

    const hasIncidents = failedCount > 0;
    const finalMessage = hasIncidents
      ? 'Carga masiva procesada con incidencias.'
      : 'Carga masiva procesada correctamente.';

    return qwikMessageResponse({
      success: true,
      message: finalMessage,
      data: {
        total: items.length,
        processed: createdCount + replacedCount,
        created: createdCount,
        replaced: replacedCount,
        failed: failedCount,
        items: itemsResults,
      },
    });
  }
}
