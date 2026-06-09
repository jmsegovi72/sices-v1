import { IsOptional, IsString, Length } from 'class-validator';
import {
  OptionalNonEmptyString,
  OptionalPositiveInt,
} from '@/common/decorators';

export class QueryMunicipalityDto {
  @OptionalPositiveInt({ fieldName: 'Estado ID' })
  stateId?: number;

  @IsOptional()
  @IsString({ message: 'El código de estado debe ser texto.' })
  @Length(2, 2, {
    message: 'El código de estado debe tener exactamente 2 caracteres.',
  })
  stateCode?: string;

  @OptionalNonEmptyString({ fieldName: 'Búsqueda por nombre' })
  searchTerm?: string;
}
