import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadStudentDocumentDto {
  @Type(() => Number)
  @IsInt({ message: 'El ID del estudiante debe ser un número entero.' })
  studentId: number;

  @Type(() => Number)
  @IsInt({ message: 'El ID del tipo de documento debe ser un número entero.' })
  documentTypeId: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega debe tener un formato de fecha válido.' })
  deliveryDate?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto.' })
  notes?: string;
}
