// src/common/dtos/personal-fields.dto.ts
import { IsNotEmpty } from 'class-validator';
import {
  IsCURP,
  IsGender,
  OptionalNonEmptyString,
  RequiredNonEmptyString,
} from '@/common/decorators';

export class PersonalFieldsDto {
  // 🔹 Nombre completo (campo calculado de la vista)
  @RequiredNonEmptyString({ fieldName: 'Nombre completo', max: 97 })
  fullName!: string;

  // 🔹 Nombre
  @RequiredNonEmptyString({ fieldName: 'Nombre', min: 2, max: 45 })
  firstName!: string;

  // 🔹 Primer apellido
  @RequiredNonEmptyString({ fieldName: 'Primer apellido', min: 2, max: 25 })
  firstLastName!: string;

  // 🔹 Segundo apellido (único campo opcional en la tabla)
  @OptionalNonEmptyString({ fieldName: 'Segundo apellido', max: 25 })
  secondLastName?: string;

  // 🔹 CURP
  @IsNotEmpty({ message: 'El campo |CURP| es obligatorio.' })
  @IsCURP('CURP')
  curp!: string;

  // 🔹 Género
  @IsGender('Género')
  gender!: string;
}
