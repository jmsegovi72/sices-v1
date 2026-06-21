import {
  OptionalBooleanString,
  OptionalNonEmptyString,
  OptionalPositiveInt,
  IsGender,
} from '@/common/decorators';
import { QueryBaseDto } from '@/common/dtos';

export class QueryDemographicDto extends QueryBaseDto {
  @OptionalBooleanString({ fieldName: 'Es indígena' })
  isIndigenous?: boolean;

  @OptionalBooleanString({ fieldName: 'Es afrodescendiente' })
  isAfroDescendant?: boolean;

  @OptionalNonEmptyString({ fieldName: 'Nombre completo' })
  fullName?: string;

  @OptionalNonEmptyString({ fieldName: 'CURP' })
  curp?: string;

  @IsGender()
  gender?: string;

  @OptionalPositiveInt({ fieldName: 'Edad mínima' })
  minAge?: number;

  @OptionalPositiveInt({ fieldName: 'Edad máxima' })
  maxAge?: number;

  @OptionalNonEmptyString({ fieldName: 'Estado civil' })
  maritalStatus?: string;

  @OptionalNonEmptyString({ fieldName: 'Lengua indígena' })
  indigenousLanguage?: string;

  @OptionalNonEmptyString({ fieldName: 'Lengua extranjera' })
  foreignLanguage?: string;

  @OptionalNonEmptyString({ fieldName: 'Condición especial' })
  specialCondition?: string;
}
// ← searchTerm ya viene en BaseQueryDto
