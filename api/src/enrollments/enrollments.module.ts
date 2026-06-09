import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { ClassesModule } from '@/classes/classes.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentsModule } from '@/students/students.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    StudentsModule,
    ClassesModule,
  ],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
