import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { UploadsService } from '@/uploads/uploads.service';
import { UploadStudentDocumentDto, UpdateStudentDocumentDto } from './dto';
import { qwikMessageResponse } from '@/common/helpers';
import type { UserFromView } from '@/common/types';
import slugify from 'slugify';
import * as fs from 'fs';
import { join, basename } from 'path';
import type { Response } from 'express';

@Injectable()
export class StudentDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly uploadsService: UploadsService,
  ) {}

  /* ============================================================
     📥 UPLOAD / UPSERT STUDENT DOCUMENT
     ------------------------------------------------------------
     📌 Sube un archivo PDF del estudiante y registra su metadato.
     Si el tipo de documento ya existe para ese estudiante,
     reemplaza el archivo físico y actualiza el registro.
     ============================================================ */
  async uploadDocument(
    dto: UploadStudentDocumentDto,
    file: any,
    currentUser: UserFromView,
  ) {
    const { studentId, documentTypeId, deliveryDate, notes } = dto;

    this.logger.info(
      { studentId, documentTypeId, updatedBy: currentUser.id },
      'Iniciando carga de documento de estudiante',
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

    // 2. Validar que sea un archivo PDF
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'Formato de archivo inválido. Solo se admiten documentos en formato PDF.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 3. Validar si el estudiante existe y traer su CURP
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { persons: true },
    });

    if (!student) {
      throw new NotFoundException(
        qwikMessageResponse({
          success: false,
          message: `El estudiante con ID ${studentId} no existe.`,
          errorCode: 'NOT_FOUND',
        }),
      );
    }

    const curp = student.persons?.curp?.trim()?.toUpperCase();
    if (!curp) {
      throw new BadRequestException(
        qwikMessageResponse({
          success: false,
          message: 'El estudiante seleccionado no tiene una CURP registrada en su perfil de persona.',
          errorCode: 'BAD_REQUEST',
        }),
      );
    }

    // 4. Validar si el tipo de documento existe
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

    // 5. Generar nombre de archivo: [CURP]-[tipo-documento-limpio].pdf
    const docTypeSlug = slugify(docType.name, { lower: true, strict: true });
    const filename = `${curp}-${docTypeSlug}.pdf`;

    // 6. Guardar el archivo en la subcarpeta 'students' mediante UploadsService
    const relativePath = await this.uploadsService.saveFile(
      file,
      'students',
      filename,
      ['application/pdf'],
      10, // Tamaño máximo de 10 MB para documentos escaneados
    );

    // 7. Buscar si ya existe un registro de este tipo para el estudiante
    const existingDoc = await this.prisma.studentDocument.findFirst({
      where: {
        studentId,
        documentTypeId,
      },
    });

    let savedDocument: any;

    if (existingDoc) {
      // Flujo de Reemplazo: Eliminar archivo anterior si la ruta física es distinta
      if (existingDoc.filePath && existingDoc.filePath !== relativePath) {
        const oldPhysicalPath = join(process.cwd(), existingDoc.filePath);
        if (fs.existsSync(oldPhysicalPath)) {
          try {
            fs.unlinkSync(oldPhysicalPath);
          } catch (error) {
            this.logger.warn(
              { path: oldPhysicalPath, error: error.message },
              'No se pudo eliminar el archivo físico anterior durante la sobreescritura',
            );
          }
        }
      }

      // Actualizar registro en base de datos
      savedDocument = await this.prisma.studentDocument.update({
        where: { id: existingDoc.id },
        data: {
          filePath: relativePath,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          notes: notes ?? null,
          updatedBy: currentUser.id,
        },
      });

      this.logger.info(
        { studentDocumentId: savedDocument.id, studentId, documentTypeId },
        'Documento de estudiante reemplazado exitosamente en base de datos',
      );
    } else {
      // Crear nuevo registro en base de datos
      savedDocument = await this.prisma.studentDocument.create({
        data: {
          studentId,
          documentTypeId,
          filePath: relativePath,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          notes: notes ?? null,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        },
      });

      this.logger.info(
        { studentDocumentId: savedDocument.id, studentId, documentTypeId },
        'Documento de estudiante creado exitosamente en base de datos',
      );
    }

    return qwikMessageResponse({
      success: true,
      message: existingDoc
        ? 'El documento del estudiante ha sido reemplazado correctamente.'
        : 'El documento del estudiante ha sido cargado correctamente.',
      data: savedDocument,
    });
  }

  /* ============================================================
     📋 FIND ALL DOCUMENTS BY STUDENT
     ------------------------------------------------------------
     📌 Retorna la lista de metadatos de documentos cargados del estudiante.
     ============================================================ */
  async findByStudent(studentId: number) {
    this.logger.info({ studentId }, 'Buscando documentos del estudiante');

    const documents = await this.prisma.viewStudentDocument.findMany({
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
     🔍 FIND ONE DOCUMENT BY ID
     ------------------------------------------------------------
     📌 Obtiene la información enriquecida de un documento específico.
     ============================================================ */
  async findOne(id: number) {
    this.logger.info({ documentId: id }, 'Buscando detalle de documento');

    const document = await this.prisma.viewStudentDocument.findFirst({
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
     📌 Modifica la fecha de entrega o notas sin alterar el archivo.
     ============================================================ */
  async updateMetadata(
    id: number,
    dto: UpdateStudentDocumentDto,
    currentUser: UserFromView,
  ) {
    this.logger.info(
      { documentId: id, updatedBy: currentUser.id },
      'Iniciando actualización de metadatos de documento',
    );

    const doc = await this.prisma.studentDocument.findUnique({
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

    const updatedDoc = await this.prisma.studentDocument.update({
      where: { id },
      data: {
        notes: dto.notes !== undefined ? dto.notes : doc.notes,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : doc.deliveryDate,
        updatedBy: currentUser.id,
      },
    });

    this.logger.info(
      { documentId: id },
      'Metadatos de documento actualizados exitosamente',
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
     📌 Transmite el archivo PDF de forma segura bajo autorización.
     ============================================================ */
  async streamFile(id: number, res: Response): Promise<StreamableFile> {
    this.logger.info({ documentId: id }, 'Iniciando transmisión de archivo físico');

    const doc = await this.prisma.studentDocument.findUnique({
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

    // Configurar cabeceras de respuesta para visualización inline en PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${basename(absolutePath)}"`,
    });

    return new StreamableFile(fs.createReadStream(absolutePath));
  }
}
