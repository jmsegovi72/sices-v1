import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  LocationFieldsDto,
  PersonalFieldsDto,
  QueryBaseDto,
} from '@/common/dtos';

// query-address.dto.ts
export class QueryAddressDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → fullName
  PartialType(PickType(PersonalFieldsDto, ['fullName'] as const)),
  // 🔹 LocationFieldsDto → stateName, municipalityName, zipCode
  PartialType(
    PickType(LocationFieldsDto, [
      'stateName',
      'municipalityName',
      'zipCode',
      'street',
      'settlement',
    ] as const),
  ),
  // 🔹 QueryBaseDto → searchTerm, isActive, limit, page
  QueryBaseDto,
) {
  // 🔹 Exclusivos de Address
}
