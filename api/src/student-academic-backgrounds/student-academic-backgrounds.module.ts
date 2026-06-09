import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentAcademicBackgroundsController } from './student-academic-backgrounds.controller';
import { StudentAcademicBackgroundsService } from './student-academic-backgrounds.service';

@Module({
  controllers: [StudentAcademicBackgroundsController],
  providers: [StudentAcademicBackgroundsService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [StudentAcademicBackgroundsService],
})
export class StudentAcademicBackgroundsModule {}
