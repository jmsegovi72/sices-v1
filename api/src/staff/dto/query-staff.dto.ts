import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  OptionalBooleanString,
  OptionalNonEmptyString,
} from '@/common/decorators';
import { PersonalFieldsDto, QueryBaseDto } from '@/common/dtos';

export class QueryStaffDto extends IntersectionType(
  PartialType(PickType(PersonalFieldsDto, ['fullName', 'curp'] as const)),
  QueryBaseDto,
) {
  @OptionalBooleanString({ fieldName: '¿Es Graduado?' })
  isGraduate?: boolean;

  @OptionalBooleanString({ fieldName: '¿Ha realizado estancia?' })
  hasDoneStay?: boolean;

  @OptionalNonEmptyString({ fieldName: 'Tipo de Personal' })
  staffType?: string;

  @OptionalNonEmptyString({ fieldName: 'Tipo de Empleo' })
  employmentType?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre de la Duración del Empleo' })
  employmentDuration?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre de la Responsabilidad' })
  responsibility?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre de la Categoría' })
  category?: string;

  @OptionalNonEmptyString({ fieldName: 'Nivel SNI' })
  sniLevel?: string;

  @OptionalNonEmptyString({ fieldName: 'Correo Institucional' })
  institutionalMail?: string;

  @OptionalNonEmptyString({ fieldName: 'Nivel Educativo' })
  educationLevel?: string;
}
