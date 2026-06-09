import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentWithdrawalDto } from './create-student-withdrawal.dto';

export class UpdateStudentWithdrawalDto extends PartialType(
  CreateStudentWithdrawalDto,
) {}
