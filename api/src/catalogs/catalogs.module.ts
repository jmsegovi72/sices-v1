import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  controllers: [CatalogsController],
  providers: [CatalogsService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [CatalogsService],
})
export class CatalogsModule {}
