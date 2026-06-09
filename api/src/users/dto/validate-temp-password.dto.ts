import { IsOptional, Length, Matches } from 'class-validator';

import { REGEX } from '@/common/helpers';

export class ValidateTempPasswordDto {
  @IsOptional()
  @Length(8, 12, {
    message: 'La contraseña debe tener entre 8 y 12 caracteres.',
  })
  @Matches(REGEX.PASSWORD, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial.',
  })
  tempPassword?: string;
}
