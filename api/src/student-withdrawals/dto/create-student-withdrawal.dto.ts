import { IsOptional } from 'class-validator';
import { RequiredPositiveInt, StrictISODate } from '@/common/decorators';

export class CreateStudentWithdrawalDto {
  @RequiredPositiveInt({ fieldName: 'Alumno' })
  studentId!: number;

  @RequiredPositiveInt({ fieldName: 'Estatus de baja' })
  studentStatusId!: number;

  @RequiredPositiveInt({ fieldName: 'Motivo de baja' })
  withdrawalReasonId!: number;

  @IsOptional()
  @StrictISODate({ fieldName: 'Fecha de baja', optional: true })
  withdrawalDate?: Date;
}
