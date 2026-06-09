import { PartialType, PickType } from '@nestjs/mapped-types';
import { OptionalBoolean } from '@/common/decorators';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(
  PickType(CreateStaffDto, [
    'titleKey',
    'staffTypeId',
    'employmentTypeId',
    'employmentDurationId',
    'responsibilityId',
    'categoryId',
    'staffStatusId',
    'systemEntryDate',
    'schoolEntryDate',
    'institutionalMail',
    'paymentUniqueKey',
  ] as const),
) {}
