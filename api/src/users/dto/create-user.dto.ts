import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { RequiredPositiveInt } from '@/common/decorators';
import { REGEX } from '@/common/helpers';

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El campo username no puede estar vacío.' })
  username!: string;

  // 🔹 Exclusivos de User
  @RequiredPositiveInt({ fieldName: 'ID de Persona', min: 1 })
  personId!: number;

  @RequiredPositiveInt({ fieldName: 'Nivel de Acceso', min: 1 })
  roleId!: number;

  @RequiredPositiveInt({ fieldName: 'Tipo de Usuario', min: 1 })
  userTypeId!: number;

  @IsOptional()
  @Length(8, 12, {
    message: 'La contraseña debe tener entre 8 y 12 caracteres.',
  })
  @Matches(REGEX.PASSWORD, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial.',
  })
  password?: string;
}
