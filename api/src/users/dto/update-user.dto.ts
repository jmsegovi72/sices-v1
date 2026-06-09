import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { OptionalPositiveInt } from '@/common/decorators';

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'El username debe ser un correo válido.' })
  username?: string;

  @OptionalPositiveInt({
    fieldName: 'ID de Rol',
    min: 1,
  })
  roleId?: number;
}
