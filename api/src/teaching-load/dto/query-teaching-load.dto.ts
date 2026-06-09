import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { OptionalNonEmptyString } from '@/common/decorators';
import { ClassFieldsDto, PersonalFieldsDto, QueryBaseDto } from '@/common/dtos';

export class QueryTeachingLoadDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → curp, fullName, gender (validador CURP y Género integrados)
  PartialType(
    PickType(PersonalFieldsDto, ['curp', 'fullName', 'gender'] as const),
  ),
  // 🔹 ClassFieldsDto → classCode (validador Regex de código de clase integrado)
  PartialType(PickType(ClassFieldsDto, ['classCode'] as const)),
  // 🔹 QueryBaseDto → searchTerm, limit, page, isActive
  QueryBaseDto,
) {
  @OptionalNonEmptyString({ fieldName: 'Nombre de la materia' })
  subjectName?: string;
}
