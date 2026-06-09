import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  LocationFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';
// query-student-academic-background.dto.ts
export class QueryStudentAcademicBackgroundDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → fullName, curp
  PartialType(PickType(PersonalFieldsDto, ['fullName', 'curp'] as const)),
  // 🔹 LocationFieldsDto → stateName, municipalityName
  PartialType(
    PickType(LocationFieldsDto, ['stateName', 'municipalityName'] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {}
