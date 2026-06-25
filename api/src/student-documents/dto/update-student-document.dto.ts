import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateStudentDocumentDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega debe tener un formato de fecha válido.' })
  deliveryDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto.' })
  notes?: string;
}
