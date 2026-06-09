import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  OptionalBooleanString,
  OptionalNonEmptyString,
  OptionalPositiveInt,
} from '@/common/decorators';
import { PersonalFieldsDto, QueryBaseDto } from '@/common/dtos';

export class QueryStaffTeachingProfileDto extends IntersectionType(
  PartialType(PickType(PersonalFieldsDto, ['fullName', 'curp'] as const)),
  QueryBaseDto,
) {
  @OptionalPositiveInt({ fieldName: 'ID de personal' })
  staffId?: number;

  @OptionalBooleanString({ fieldName: 'Frente a grupo' })
  isClassroomTeacher?: boolean;

  @OptionalNonEmptyString({ fieldName: 'Nivel en el que imparte clases' })
  levelTaught?: string;
}
