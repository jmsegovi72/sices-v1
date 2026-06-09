import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { UploadsModule } from '@/uploads';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule, CommonModule, AuthModule, UploadsModule],
})
export class UsersModule {}
