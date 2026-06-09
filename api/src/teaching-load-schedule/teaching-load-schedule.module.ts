import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { TeachingLoadScheduleController } from './teaching-load-schedule.controller';
import { TeachingLoadScheduleService } from './teaching-load-schedule.service';

@Module({
  controllers: [TeachingLoadScheduleController],
  providers: [TeachingLoadScheduleService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [TeachingLoadScheduleService],
})
export class TeachingLoadScheduleModule {}
