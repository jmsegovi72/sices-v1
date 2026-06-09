import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
  controllers: [PersonsController],
  providers: [PersonsService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [PersonsService], // <- esto lo hace accesible a otros módulos
})
export class PersonsModule {}
