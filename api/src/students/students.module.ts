import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PersonsModule } from '@/persons/persons.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  imports: [PrismaModule, CommonModule, AuthModule, PersonsModule],
  exports: [StudentsService],
})
export class StudentsModule {}
