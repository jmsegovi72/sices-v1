import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { TeachingLoadController } from './teaching-load.controller';
import { TeachingLoadService } from './teaching-load.service';

@Module({
  controllers: [TeachingLoadController],
  providers: [TeachingLoadService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [TeachingLoadService],
})
export class TeachingLoadModule {}
