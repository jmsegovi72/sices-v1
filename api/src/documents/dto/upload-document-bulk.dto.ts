import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadDocumentBulkDto {
  @Type(() => Number)
  @IsInt({ message: 'El ID de la persona debe ser un número entero.' })
  personId: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega global debe tener un formato de fecha válido.' })
  deliveryDate?: string;
}
