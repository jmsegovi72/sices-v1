import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStaffTeachingProfileDto } from './create-staff-teaching-profile.dto';

export class UpdateStaffTeachingProfileDto extends PartialType(
  OmitType(CreateStaffTeachingProfileDto, ['staffId'] as const),
) {}
