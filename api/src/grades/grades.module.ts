import { Module } from '@nestjs/common';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';

@Module({
  controllers: [GradesController],
  providers: [GradesService],
  imports: [PrismaModule, CommonModule],
})
export class GradesModule {}
