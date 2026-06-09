// create-zip-code.dto.ts
import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { RequiredPositiveInt } from '@/common/decorators';
import { LocationFieldsDto } from '@/common/dtos/base/location-fields.dto';

export class CreateZipCodeDto extends IntersectionType(
  PickType(LocationFieldsDto, [
    'municipalityId',
    'zipCode',
    'settlement',
    'locality',
    'zoneType',
  ] as const),
) {
  @RequiredPositiveInt({ fieldName: 'Tipo de asentamiento' })
  settlementTypeId!: number;
}
