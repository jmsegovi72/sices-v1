import { OptionalBooleanString } from '../decorators/validators/optional-boolean.decorator';
import { OptionalNonEmptyString } from '../decorators/validators/string-validators.decorator';
import { PaginationDto } from './pagination.dto';

/**
 * @deprecated
 * ⚠️ ARCHIVO DEPRECADO — PENDIENTE DE ELIMINAR
 * ------------------------------------------------------------
 */
export class BaseQueryDto extends PaginationDto {
  @OptionalNonEmptyString({ fieldName: 'searchTerm' })
  searchTerm?: string;

  @OptionalBooleanString({ fieldName: 'Esta Activo' })
  isActive?: boolean;
}
