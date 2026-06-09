import {
  OptionalBooleanString,
  OptionalNonEmptyString,
} from '@/common/decorators';
import { PaginationDto } from '../pagination.dto';

// src/common/dtos/query-base.dto.ts  ← renombrar archivo
export class QueryBaseDto extends PaginationDto {
  @OptionalNonEmptyString({ fieldName: 'searchTerm' })
  searchTerm?: string;

  @OptionalBooleanString({ fieldName: 'Esta Activo' })
  isActive?: boolean;
}
