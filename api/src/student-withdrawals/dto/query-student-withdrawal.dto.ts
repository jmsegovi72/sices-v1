import {
  OptionalNonEmptyString,
  OptionalPositiveInt,
} from '@/common/decorators';
import { QueryBaseDto } from '@/common/dtos';

export class QueryStudentWithdrawalDto extends QueryBaseDto {
  // 🔹 Filtros de Alumno
  @OptionalNonEmptyString({ fieldName: 'Matrícula del alumno', max: 25 })
  studentCode?: string;

  @OptionalNonEmptyString({ fieldName: 'CURP del alumno', max: 18 })
  studentCurp?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre completo del alumno', max: 100 })
  studentFullName?: string;

  // 🔹 Filtros Académicos (para Reportes)
  @OptionalNonEmptyString({ fieldName: 'Período semestral', max: 30 })
  semiannualPeriod?: string;

  @OptionalPositiveInt({ fieldName: 'Semestre' })
  semester?: number;

  @OptionalNonEmptyString({ fieldName: 'Programa educativo', max: 125 })
  educationalProgram?: string;

  @OptionalNonEmptyString({ fieldName: 'Nivel de educación', max: 45 })
  educationLevel?: string;

  @OptionalNonEmptyString({ fieldName: 'Disciplina académica', max: 45 })
  academicDiscipline?: string;

  // 🔹 Filtros de la Baja (usando valores representativos en lugar de IDs)
  @OptionalNonEmptyString({ fieldName: 'Clave de Estatus de baja', max: 2 })
  studentStatusKey?: string;

  @OptionalNonEmptyString({ fieldName: 'Motivo de la baja', max: 150 })
  reasonForDropout?: string;

  @OptionalNonEmptyString({ fieldName: 'Código de clase', max: 11 })
  classCode?: string;
}
