import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadDocumentDto {
  @Type(() => Number)
  @IsInt({ message: 'El ID de la persona debe ser un número entero.' })
  personId: number;

  @Type(() => Number)
  @IsInt({ message: 'El ID del tipo de documento debe ser un número entero.' })
  documentTypeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID del estudiante debe ser un número entero.' })
  studentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de personal debe ser un número entero.' })
  staffId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega debe tener un formato de fecha válido.' })
  deliveryDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto.' })
  notes?: string;
}
