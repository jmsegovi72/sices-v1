import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffAcademicProfileDto extends PartialType(
  PickType(CreateStaffDto, [
    'educationLevelId',
    'isGraduate',
    'graduationDate',
    'schoolOfOriginId',
    'knowledgeAreaId',
    'disciplineId',
    'sniLevel',
    'researchProject',
    'thesisTopic',
    'hasDoneStay',
  ] as const),
) {}
