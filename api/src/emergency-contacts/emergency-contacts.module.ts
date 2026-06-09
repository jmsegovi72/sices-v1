import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyContactsService } from './emergency-contacts.service';

@Module({
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService],
  imports: [PrismaModule, CommonModule, AuthModule],
  exports: [EmergencyContactsService], // Exportamos el servicio para uso en otros módulos si es necesario|
})
export class EmergencyContactsModule {}
