import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth, AuthModulePermission, GetUser } from '@/auth/decorators';
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { ParsePositiveIntPipe } from '@/common/pipes';
import type { UserFromView } from '@/common/types';
import { UploadStudentDocumentDto, UpdateStudentDocumentDto } from './dto';
import { StudentDocumentsService } from './student-documents.service';
import type { Response } from 'express';

@Controller('student-documents')
export class StudentDocumentsController {
  constructor(
    private readonly studentDocumentsService: StudentDocumentsService,
  ) {}

  /* ============================================================
     📥 POST: UPLOAD OR UPSERT DOCUMENT
     ------------------------------------------------------------
     📌 Carga o reemplaza un archivo PDF del estudiante.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() dto: UploadStudentDocumentDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.studentDocumentsService.uploadDocument(dto, file, user);
  }

  /* ============================================================
     📋 GET: FIND ALL DOCUMENTS BY STUDENT
     ------------------------------------------------------------
     📌 Consulta todos los documentos cargados de un estudiante.
     ============================================================ */
  @Get('student/:studentId')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findByStudent(
    @Param('studentId', ParsePositiveIntPipe) studentId: number,
  ) {
    return await this.studentDocumentsService.findByStudent(studentId);
  }

  /* ============================================================
     🔍 GET: FIND ONE DOCUMENT BY ID
     ------------------------------------------------------------
     📌 Consulta el detalle de metadatos de un documento por su ID.
     ============================================================ */
  @Get(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return await this.studentDocumentsService.findOne(id);
  }

  /* ============================================================
     🔒 GET: SECURE FILE STREAM / DOWNLOAD
     ------------------------------------------------------------
     📌 Transmite el PDF de forma segura solo a usuarios autorizados.
     ============================================================ */
  @Get(':id/file')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'read')
  @HttpCode(HttpStatus.OK)
  async streamFile(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.studentDocumentsService.streamFile(id, res);
  }

  /* ============================================================
     ✏️ PATCH: UPDATE DOCUMENT METADATA
     ------------------------------------------------------------
     📌 Modifica notas o fecha de entrega de un documento.
     ============================================================ */
  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'update')
  @HttpCode(HttpStatus.OK)
  async updateMetadata(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: UpdateStudentDocumentDto,
    @GetUser() user: UserFromView,
  ) {
    return await this.studentDocumentsService.updateMetadata(id, dto, user);
  }

  /* ============================================================
     🗑️ DELETE: REMOVE DOCUMENT
     ------------------------------------------------------------
     📌 Elimina registro de BD y remueve el archivo físico de disco.
     ============================================================ */
  @Delete(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.STUDENTS, 'delete')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return await this.studentDocumentsService.remove(id);
  }
}
