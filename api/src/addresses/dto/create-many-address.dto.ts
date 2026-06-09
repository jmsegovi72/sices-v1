import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

export class CreateManyAddressDto {
  @IsArray({ message: 'El campo |addresses| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses!: CreateAddressDto[];
}
