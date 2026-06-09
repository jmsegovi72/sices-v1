import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  OptionalNonEmptyString,
  OptionalPositiveInt,
} from '@/common/decorators';
import {
  AcademicFieldsDto,
  ClassFieldsDto,
  LocationFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';

// query-student.dto.ts
export class QueryStudentDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → firstName, firstLastName, secondLastName, curp, fullName
  PartialType(
    PickType(PersonalFieldsDto, [
      'firstName',
      'firstLastName',
      'secondLastName',
      'curp',
      'fullName',
    ] as const),
  ),
  // 🔹 LocationFieldsDto → stateName, municipalityName
  PartialType(
    PickType(LocationFieldsDto, ['stateName', 'municipalityName'] as const),
  ),
  // 🔹 AcademicFieldsDto → academicDiscipline, educationLevel, modality, studyPlan, codeNumber, semester
  PartialType(
    PickType(AcademicFieldsDto, [
      'academicDiscipline',
      'educationLevel',
      'modality',
      'studyPlan',
      'codeNumber',
      'semester',
    ] as const),
  ),
  // 🔹 ClassFieldsDto → schoolYear
  PartialType(PickType(ClassFieldsDto, ['schoolYear'] as const)),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  // 🔹 Exclusivos de Student
  @OptionalPositiveInt({ fieldName: 'Generación' })
  generation?: number;

  @OptionalNonEmptyString({ fieldName: 'Clave de status', max: 2 })
  statusKey?: string;
}
