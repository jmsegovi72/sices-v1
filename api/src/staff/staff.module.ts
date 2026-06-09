import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PersonsModule } from '@/persons/persons.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  imports: [PrismaModule, CommonModule, AuthModule, PersonsModule],
  exports: [StaffService],
})
export class StaffModule {}
