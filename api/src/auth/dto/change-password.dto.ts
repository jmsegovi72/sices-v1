import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { REGEX } from '@/common/helpers';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  currentPassword!: string; // 👈 Agréguelo aquí
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  @Length(8, 12, {
    message: 'La contraseña debe tener entre 8 y 12 caracteres.',
  })
  @Matches(REGEX.PASSWORD, {
    message:
      'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial.',
  })
  newPassword!: string; // 👈 Cambiado de 'password' a 'newPassword' para claridad

  @IsNotEmpty({ message: 'Debes confirmar la nueva contraseña.' })
  confirmPassword!: string; // 👈 Indispensable para evitar errores del usuario

  @IsOptional()
  @IsBoolean({
    message: 'El campo isFirstLogin debe ser un valor booleano.',
  })
  isFirstLogin?: boolean;
}
