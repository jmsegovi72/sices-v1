import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object para el login de usuarios.
 * Ahora simplificado para usar únicamente el correo electrónico.
 */
export class LoginUserDto {
  /**
   * Correo electrónico institucional del usuario.
   */
  @IsEmail({}, { message: 'El login debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El campo login no puede estar vacío.' })
  login!: string;

  /**
   * Contraseña del usuario.
   */
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password!: string;
}
