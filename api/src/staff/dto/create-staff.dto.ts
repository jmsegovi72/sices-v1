import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import {
  OptionalBoolean,
  OptionalNonEmptyString,
  OptionalPositiveInt,
  RequiredNonEmptyString,
  RequiredPositiveInt,
  StrictISODate,
} from '@/common/decorators';

export const SNI_LEVELS = [
  'No aplica',
  'Candidato',
  'Nivel 1',
  'Nivel 2',
  'Nivel 3',
  'Nivel Emérito',
] as const;

// ─── Staff ───────────────────────────────────────────────────
export class CreateStaffDto {
  // 🔹 Persona
  @RequiredPositiveInt({ fieldName: 'Persona' })
  personId!: number;

  // 🔹 Tratamiento
  @RequiredNonEmptyString({ fieldName: 'Tratamiento', max: 8 })
  titleKey!: string;

  // 🔹 Tipo de personal
  @RequiredPositiveInt({ fieldName: 'Tipo de personal' })
  staffTypeId!: number;

  // 🔹 Tipo de empleo
  @RequiredPositiveInt({ fieldName: 'Tipo de empleo' })
  employmentTypeId!: number;

  // 🔹 Duración de empleo
  @RequiredPositiveInt({ fieldName: 'Duración de empleo' })
  employmentDurationId!: number;

  // 🔹 Responsabilidad
  @RequiredPositiveInt({ fieldName: 'Responsabilidad' })
  responsibilityId!: number;

  // 🔹 Categoría
  @RequiredPositiveInt({ fieldName: 'Categoría' })
  categoryId!: number;

  // 🔹 Estatus del personal (opcional, por defecto 1 = Activo)
  @OptionalPositiveInt({ fieldName: 'Estatus del personal' })
  staffStatusId?: number;

  // 🔹 Fecha de ingreso al sistema
  @StrictISODate({ fieldName: 'Fecha de ingreso al sistema', optional: true })
  systemEntryDate?: Date;

  // 🔹 Fecha de ingreso a la escuela
  @StrictISODate({ fieldName: 'Fecha de ingreso a la escuela', optional: true })
  schoolEntryDate?: Date;

  // 🔹 Correo institucional (opcional al crear)
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail(
    {},
    { message: 'El |correo institucional| no tiene formato válido.' },
  )
  institutionalMail?: string;

  // 🔹 Clave única de pago
  @OptionalNonEmptyString({ fieldName: 'Clave única de pago', max: 45 })
  paymentUniqueKey?: string;

  // ─── Staff Academic Profile ───────────────────────────────
  // 🔹 Nivel educativo
  @RequiredPositiveInt({ fieldName: 'Nivel educativo' })
  educationLevelId!: number;

  // 🔹 ¿Titulado?
  @OptionalBoolean({ fieldName: 'Titulado' })
  isGraduate?: boolean;

  // 🔹 Fecha de titulación
  @IsOptional()
  @StrictISODate({ fieldName: 'Fecha de titulación', optional: true })
  graduationDate?: Date;

  // 🔹 Escuela de origen
  @OptionalPositiveInt({ fieldName: 'Escuela de origen' })
  schoolOfOriginId?: number;

  // 🔹 Área de conocimiento
  @OptionalPositiveInt({ fieldName: 'Área de conocimiento' })
  knowledgeAreaId?: number;

  // 🔹 Disciplina
  @OptionalPositiveInt({ fieldName: 'Disciplina' })
  disciplineId?: number;

  // 🔹 Nivel SNI
  @IsOptional()
  @IsIn(SNI_LEVELS, {
    message: 'El |nivel SNI| no es válido.',
  })
  sniLevel?: string;

  // 🔹 Proyecto de investigación
  @OptionalNonEmptyString({ fieldName: 'Proyecto de investigación', max: 100 })
  researchProject?: string;

  // 🔹 Tema de tesis
  @OptionalNonEmptyString({ fieldName: 'Tema de tesis', max: 150 })
  thesisTopic?: string;

  // 🔹 ¿Ha realizado estancia?
  @OptionalBoolean({ fieldName: 'Estancia académica' })
  hasDoneStay?: boolean;
}
