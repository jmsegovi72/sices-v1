import { RequiredPositiveInt } from '@/common/decorators';

export class ChangeStaffStatusDto {
  @RequiredPositiveInt({ fieldName: 'Estatus del personal' })
  staffStatusId!: number;
}
