import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DemographicsController } from './demographics.controller';
import { DemographicsService } from './demographics.service';

@Module({
  controllers: [DemographicsController],
  providers: [DemographicsService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [DemographicsService],
})
export class DemographicsModule {}
