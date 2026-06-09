import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { OptionalPositiveInt, RequiredPositiveInt } from '@/common/decorators';
import { AcademicFieldsDto, ContactFieldsDto } from '@/common/dtos';

// create-student.dto.ts
export class CreateStudentDto extends IntersectionType(
  // 🔹 AcademicFieldsDto → codeNumber (opcional)
  PartialType(PickType(AcademicFieldsDto, ['codeNumber'] as const)),
  // 🔹 ContactFieldsDto → email (opcional aquí)
  PartialType(PickType(ContactFieldsDto, ['email'] as const)),
) {
  // 🔹 Exclusivos de Student
  @RequiredPositiveInt({ fieldName: 'Persona' })
  personId!: number;

  @RequiredPositiveInt({ fieldName: 'Generación' })
  generationId!: number;

  @RequiredPositiveInt({ fieldName: 'Programa educativo' })
  educationalProgramId!: number;

  @OptionalPositiveInt({ fieldName: 'Status' })
  statusId?: number;
}
