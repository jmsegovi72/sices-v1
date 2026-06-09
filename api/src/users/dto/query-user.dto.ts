import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  OptionalBooleanString,
  OptionalNonEmptyString,
} from '@/common/decorators';
import { PersonalFieldsDto, QueryBaseDto } from '@/common/dtos';

// query-user.dto.ts
export class QueryUserDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → firstName, firstLastName, secondLastName, fullName
  PartialType(
    PickType(PersonalFieldsDto, [
      'firstName',
      'firstLastName',
      'secondLastName',
      'fullName',
    ] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  // 🔹 Exclusivos de User
  @OptionalNonEmptyString({ fieldName: 'Rol', max: 45 })
  roleName?: string;

  @OptionalNonEmptyString({ fieldName: 'Tipo de usuario', max: 45 })
  userTypeName?: string;

  @OptionalBooleanString({ fieldName: 'Primer login' })
  isFirstLogin?: boolean;
}
