import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { AcademicFieldsDto, ClassFieldsDto, QueryBaseDto } from '@/common/dtos';

// query-class.dto.ts
export class QueryClassDto extends IntersectionType(
  // 🔹 ClassFieldsDto → classCode, semiannualPeriod, schoolYear
  PartialType(
    PickType(ClassFieldsDto, [
      'classCode',
      'semiannualPeriod',
      'schoolYear',
    ] as const),
  ),
  // 🔹 AcademicFieldsDto → academicDiscipline, educationLevel
  PartialType(
    PickType(AcademicFieldsDto, [
      'academicDiscipline',
      'educationLevel',
      'semester',
      'modality',
    ] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  // 🔹 Exclusivos de Class
}
