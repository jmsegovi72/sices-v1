// src/modules/emergency-contacts/dto/create-many-emergency-contact.dto.ts

import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateEmergencyContactDto } from './create-emergency-contact.dto';

export class CreateManyEmergencyContactDto {
  @IsArray({ message: 'El campo |emergencyContacts| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateEmergencyContactDto)
  emergencyContacts!: CreateEmergencyContactDto[];
}
