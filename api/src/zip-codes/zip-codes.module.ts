import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { ZipCodesController } from './zip-codes.controller';
import { ZipCodesService } from './zip-codes.service';

@Module({
  controllers: [ZipCodesController],
  providers: [ZipCodesService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [ZipCodesService],
})
export class ZipCodesModule {}
