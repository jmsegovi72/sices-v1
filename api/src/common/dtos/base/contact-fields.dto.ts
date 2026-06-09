// src/common/dtos/contact-fields.dto.ts

import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { IsPhoneMX } from '@/common/decorators';

export class ContactFieldsDto {
  // 🔹 Teléfono
  @IsPhoneMX('Teléfono')
  phone!: string;

  // 🔹 Correo electrónico
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email!: string;
}
