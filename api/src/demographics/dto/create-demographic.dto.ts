import {
  OptionalBoolean,
  OptionalPositiveInt,
  RequiredPositiveInt,
} from '@/common/decorators';

export class CreateDemographicDto {
  // 🔹 PERSONA
  @RequiredPositiveInt({ fieldName: 'Persona' })
  personId!: number;

  // 🔹 ESTADO CIVIL
  @OptionalPositiveInt({ fieldName: 'Estado civil' })
  maritalStatusId?: number;

  // 🔹 LENGUA INDÍGENA
  @OptionalPositiveInt({ fieldName: 'Lengua indígena' })
  indigenousLangId?: number;

  // 🔹 IDIOMA EXTRANJERO
  @OptionalPositiveInt({ fieldName: 'Idioma extranjero' })
  foreignLangId?: number;

  // 🔹 CONDICIÓN ESPECIAL
  @OptionalPositiveInt({ fieldName: 'Condición especial' })
  specialConditionId?: number;

  // 🔹 ES INDÍGENA
  @OptionalBoolean({ fieldName: 'Indígenas por autoadscripción' })
  isIndigenous?: boolean;

  // 🔹 ES AFRODESCENDIENTE
  @OptionalBoolean({ fieldName: 'Afrodescendiente por autoadscripción' })
  isAfroDescendant?: boolean;
}
