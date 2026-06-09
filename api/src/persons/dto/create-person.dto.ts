import { IntersectionType, PickType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';
import { OptionalPositiveInt, StrictISODate } from '@/common/decorators';
import { ContactFieldsDto, PersonalFieldsDto } from '@/common/dtos';

export class CreatePersonDto extends IntersectionType(
  PickType(PersonalFieldsDto, [
    'firstName',
    'firstLastName',
    'secondLastName',
    'curp',
    'gender',
  ] as const),
  ContactFieldsDto,
) {
  // 🔹 ID Municipio (Opcional en base de datos)
  @OptionalPositiveInt({ fieldName: 'ID Municipio' })
  municipalityId?: number;

  // 🔹 DATOS DERIVABLES DESDE CURP (OPCIONALES)
  @IsOptional()
  @StrictISODate({ fieldName: 'Fecha de nacimiento' })
  birthDate?: Date;

  // 🔹 HOMOCLAVE
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @Matches(/^[A-Z0-9]{3}$/, {
    message: 'La homoclave debe tener 3 caracteres alfanuméricos.',
  })
  homoclave?: string;

  // 🔹 NACIONALIDAD
  @IsOptional()
  @Matches(/^[A-Z]$/, {
    message: 'El campo |nacionalidad| debe ser una letra.',
  })
  nationality?: string;
}
