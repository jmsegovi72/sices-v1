// src/common/dtos/location-fields.dto.ts

import { zip_codes_zone_type } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';
import {
  OptionalNonEmptyString,
  RequiredNonEmptyString,
  RequiredPositiveInt,
} from '@/common/decorators';

export class LocationFieldsDto {
  // 🔹 Estado
  @RequiredNonEmptyString({ fieldName: 'Nombre del estado', max: 45 })
  stateName!: string;

  @RequiredPositiveInt({ fieldName: 'ID Estado' })
  stateId!: number;

  // 🔹 Municipio
  @RequiredNonEmptyString({ fieldName: 'Nombre del municipio', max: 100 })
  municipalityName!: string;

  @RequiredPositiveInt({ fieldName: 'ID Municipio' })
  municipalityId!: number;

  // 🔹 Código postal
  @RequiredNonEmptyString({ fieldName: 'Código postal', max: 5 })
  zipCode!: string;

  // 🔹 Tipo de asentamiento
  @RequiredNonEmptyString({ fieldName: 'Tipo de asentamiento', max: 25 })
  settlementType!: string;

  // 🔹 Asentamiento
  @RequiredNonEmptyString({ fieldName: 'Asentamiento', min: 1, max: 125 })
  settlement!: string;

  // 🔹 Localidad
  @OptionalNonEmptyString({ fieldName: 'Localidad', max: 125 })
  locality?: string;

  // 🔹 Tipo de zona
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIn(Object.values(zip_codes_zone_type), {
    message: 'El campo |tipo de zona| debe ser Urbano o Rural.',
  })
  zoneType!: zip_codes_zone_type;
  // 🔹 CALLE
  @RequiredNonEmptyString({ fieldName: 'Calle', min: 1, max: 45 })
  street!: string;
}
