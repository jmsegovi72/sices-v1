import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  LocationFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';
import { OptionalBooleanString } from '@/common/decorators';

// query-person.dto.ts
export class QueryPersonDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → curp, firstName, firstLastName, secondLastName, fullName
  PartialType(
    PickType(PersonalFieldsDto, [
      'curp',
      'firstName',
      'firstLastName',
      'secondLastName',
      'fullName',
      'gender',
    ] as const),
  ),
  // 🔹 LocationFieldsDto → stateName, municipalityName
  PartialType(
    PickType(LocationFieldsDto, ['stateName', 'municipalityName'] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  @OptionalBooleanString({ fieldName: 'hasAddress' })
  hasAddress?: boolean;

  @OptionalBooleanString({ fieldName: 'hasDemographic' })
  hasDemographic?: boolean;

  @OptionalBooleanString({ fieldName: 'hasEmergencyContact' })
  hasEmergencyContact?: boolean;
}
