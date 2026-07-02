import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { Auth, AuthModulePermission, GetUser } from '@/auth/decorators';
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import { UploadDocumentDto, UpdateDocumentDto, UploadDocumentBulkDto } from './dto';
import { DocumentsService } from './documents.service';
import type { Response } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  /* ============================================================
     📥 POST: UPLOAD OR UPSERT DOCUMENT
     ------------------------------------------------------------
     📌 Carga o reemplaza un archivo y guarda su metadata.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'update')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() dto: UploadDocumentDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.documentsService.uploadDocument(dto, file, user);
  }

  /* ============================================================
     📥 POST: BULK UPLOAD OR UPSERT DOCUMENTS
     ------------------------------------------------------------
     📌 Carga masiva de documentos en una sola operación.
     ============================================================ */
  @Post('bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'update')
  @UseInterceptors(AnyFilesInterceptor())
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  @HttpCode(HttpStatus.OK)
  async uploadDocumentsBulk(
    @UploadedFiles() files: any[],
    @Body() dto: UploadDocumentBulkDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.documentsService.uploadDocumentsBulk(dto, files, user);
  }

  /* ============================================================
     📋 GET: FIND ALL DOCUMENTS BY PERSON
     ------------------------------------------------------------
     📌 Consulta todos los documentos de una persona física.
     ============================================================ */
  @Get('person/:personId')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findByPerson(
    @Param('personId', ParsePositiveIntPipe) personId: number,
  ) {
    return await this.documentsService.findByPerson(personId);
  }

  /* ============================================================
     📋 GET: FIND ALL DOCUMENTS BY STUDENT CONTEXT
     ------------------------------------------------------------
     📌 Consulta todos los documentos de un alumno.
     ============================================================ */
  @Get('student/:studentId')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findByStudent(
    @Param('studentId', ParsePositiveIntPipe) studentId: number,
  ) {
    return await this.documentsService.findByStudent(studentId);
  }

  /* ============================================================
     📋 GET: FIND ALL DOCUMENTS BY STAFF CONTEXT
     ------------------------------------------------------------
     📌 Consulta todos los documentos de un docente o administrativo.
     ============================================================ */
  @Get('staff/:staffId')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findByStaff(
    @Param('staffId', ParsePositiveIntPipe) staffId: number,
  ) {
    return await this.documentsService.findByStaff(staffId);
  }

  /* ============================================================
     🔍 GET: FIND ONE DOCUMENT BY ID
     ------------------------------------------------------------
     📌 Consulta el detalle de un documento por su ID de registro.
     ============================================================ */
  @Get(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return await this.documentsService.findOne(id);
  }

  /* ============================================================
     🔒 GET: SECURE FILE STREAM / DOWNLOAD
     ------------------------------------------------------------
     📌 Transmite el archivo físicamente de forma segura.
     ============================================================ */
  @Get(':id/file')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async streamFile(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.documentsService.streamFile(id, res);
  }

  /* ============================================================
     ✏️ PATCH: UPDATE DOCUMENT METADATA
     ------------------------------------------------------------
     📌 Modifica notas o relaciones de contexto del documento.
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DOCUMENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async updateMetadata(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.documentsService.updateMetadata(id, dto, user);
  }
}
