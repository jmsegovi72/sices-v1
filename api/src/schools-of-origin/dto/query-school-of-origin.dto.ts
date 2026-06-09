import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { OptionalNonEmptyString } from '@/common/decorators';
import {
  AcademicFieldsDto,
  LocationFieldsDto,
  MiscFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';

// query-school-of-origin.dto.ts
export class QuerySchoolOfOriginDto extends IntersectionType(
  // 🔹 LocationFieldsDto → stateName, municipalityName
  PartialType(
    PickType(LocationFieldsDto, ['stateName', 'municipalityName'] as const),
  ),
  // 🔹 AcademicFieldsDto → educationLevel
  PartialType(PickType(AcademicFieldsDto, ['educationLevel'] as const)),
  // 🔹 MiscFieldsDto → cct, fundingSource
  PartialType(PickType(MiscFieldsDto, ['cct', 'fundingSource'] as const)),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  // 🔹 Exclusivo de SchoolOfOrigin
  @OptionalNonEmptyString({ fieldName: 'Nombre de escuela', max: 150 })
  schoolName?: string;
}
