import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { OptionalNonNegativeInt } from '@/common/decorators';
import {
  AcademicFieldsDto,
  ClassFieldsDto,
  MiscFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';

export class QueryGradeDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → curp, fullName
  PartialType(PickType(PersonalFieldsDto, ['curp', 'fullName'] as const)),
  // 🔹 ClassFieldsDto → classCode, schoolYear, semiannualPeriod
  PartialType(PickType(ClassFieldsDto, ['classCode', 'schoolYear', 'semiannualPeriod'] as const)),
  // 🔹 AcademicFieldsDto → codeNumber
  PartialType(PickType(AcademicFieldsDto, ['codeNumber'] as const)),
  // 🔹 MiscFieldsDto → type, temporality (heredando validaciones)
  PartialType(PickType(MiscFieldsDto, ['type', 'temporality'] as const)),
  // 🔹 QueryBaseDto → searchTerm, limit, page
  QueryBaseDto,
) {
  // 🔹 Campos exclusivos de grades
  @IsOptional()
  @IsString({
    message: 'El nombre de la materia debe ser una cadena de texto.',
  })
  subjectName?: string;

  @IsOptional()
  @OptionalNonNegativeInt({ fieldName: 'Oportunidad', min: 0, max: 2 })
  opportunity?: number;
}
