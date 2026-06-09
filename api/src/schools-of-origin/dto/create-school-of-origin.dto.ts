import { IntersectionType, PickType } from '@nestjs/mapped-types';
import {
  RequiredNonEmptyString,
  RequiredPositiveInt,
} from '@/common/decorators';
import { LocationFieldsDto, MiscFieldsDto } from '@/common/dtos';

// create-school-of-origin.dto.ts
export class CreateSchoolOfOriginDto extends IntersectionType(
  // 🔹 MiscFieldsDto → cct, fundingSource
  PickType(MiscFieldsDto, ['cct', 'fundingSource'] as const),
  // 🔹 LocationFieldsDto → municipalityId
  PickType(LocationFieldsDto, ['municipalityId'] as const),
) {
  // 🔹 Exclusivos de SchoolOfOrigin
  @RequiredNonEmptyString({ fieldName: 'Nombre', min: 1, max: 150 })
  name!: string;

  @RequiredPositiveInt({ fieldName: 'Nivel ofertado' })
  offeredLevelId!: number;
}
