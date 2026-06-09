import { IntersectionType, PickType } from '@nestjs/mapped-types';
import {
  OptionalNonEmptyString,
  RequiredPositiveInt,
} from '@/common/decorators';
import { LocationFieldsDto } from '@/common/dtos';

export class CreateAddressDto extends IntersectionType(
  PickType(LocationFieldsDto, [
    'street', // ← viene de aquí
  ] as const),
) {
  // 🔹 TIPO DE CALLE
  @RequiredPositiveInt({ fieldName: 'Tipo de calle' })
  streetTypeId!: number;

  // 🔹 NÚMERO EXTERIOR
  @OptionalNonEmptyString({ fieldName: 'Número exterior', max: 20 })
  exteriorNumber?: string;

  // 🔹 NÚMERO INTERIOR
  @OptionalNonEmptyString({ fieldName: 'Número interior', max: 20 })
  interiorNumber?: string;

  // 🔹 MANZANA
  @OptionalNonEmptyString({ fieldName: 'Manzana', max: 20 })
  block?: string;

  // 🔹 ENTRE CALLES
  @OptionalNonEmptyString({ fieldName: 'Entre calles', max: 90 })
  betweenStreets?: string;

  // 🔹 PERSONA
  @RequiredPositiveInt({ fieldName: 'Persona' })
  personId!: number;

  // 🔹 CÓDIGO POSTAL
  @RequiredPositiveInt({ fieldName: 'Código postal' })
  zipCodeId!: number;
}
