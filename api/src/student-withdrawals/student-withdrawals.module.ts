import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentWithdrawalsController } from './student-withdrawals.controller';
import { StudentWithdrawalsService } from './student-withdrawals.service';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule],
  controllers: [StudentWithdrawalsController],
  providers: [StudentWithdrawalsService],
  exports: [StudentWithdrawalsService],
})
export class StudentWithdrawalsModule {}
