import { IsOptional } from 'class-validator';
import { IsCURP, OptionalNonEmptyString } from '../decorators';

/**
 * @deprecated
 * ⚠️ ARCHIVO DEPRECADO — PENDIENTE DE ELIMINAR
 * ------------------------------------------------------------
 */
export class QueryPersonalInfoDto {
  @OptionalNonEmptyString({
    fieldName: 'Nombre',
  })
  firstName?: string;

  @OptionalNonEmptyString({
    fieldName: 'Apellido paterno',
  })
  firstLastName?: string;

  @OptionalNonEmptyString({
    fieldName: 'Apellido materno',
  })
  secondLastName?: string;

  @IsOptional()
  @IsCURP('CURP')
  curp?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre completo', max: 97 })
  fullName?: string;
}
