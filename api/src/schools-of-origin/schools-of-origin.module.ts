import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { SchoolsOfOriginController } from './schools-of-origin.controller';
import { SchoolsOfOriginService } from './schools-of-origin.service';

@Module({
  controllers: [SchoolsOfOriginController],
  providers: [SchoolsOfOriginService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [SchoolsOfOriginService],
})
export class SchoolsOfOriginModule {}
