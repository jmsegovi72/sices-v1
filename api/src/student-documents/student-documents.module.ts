import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { StudentDocumentsController } from './student-documents.controller';
import { StudentDocumentsService } from './student-documents.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [StudentDocumentsController],
  providers: [StudentDocumentsService],
  exports: [StudentDocumentsService],
})
export class StudentDocumentsModule {}
