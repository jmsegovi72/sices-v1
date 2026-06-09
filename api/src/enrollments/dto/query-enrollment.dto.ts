import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  AcademicFieldsDto,
  ClassFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';

// query-enrollment.dto.ts
export class QueryEnrollmentDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → curp, firstName, firstLastName, secondLastName, fullName, gender
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
  // 🔹 ClassFieldsDto → classCode, schoolYear, semiannualPeriod
  PartialType(
    PickType(ClassFieldsDto, [
      'classCode',
      'schoolYear',
      'semiannualPeriod',
    ] as const),
  ),
  // 🔹 AcademicFieldsDto → educationalProgram, academicDiscipline, educationLevel, semester
  PartialType(
    PickType(AcademicFieldsDto, [
      'educationalProgram',
      'academicDiscipline',
      'educationLevel',
      'semester',
      'codeNumber',
    ] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, limit, page
  QueryBaseDto,
) {}
