import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';

import { LocationFieldsDto, QueryBaseDto } from '@/common/dtos';

// query-zip-code.dto.ts
export class QueryZipCodeDto extends IntersectionType(
  PartialType(
    PickType(LocationFieldsDto, [
      'stateName',
      'municipalityName',
      'zipCode',
      'settlementType',
      'settlement',
      'locality',
      'zoneType',
    ] as const),
  ),
  QueryBaseDto,
) {}
