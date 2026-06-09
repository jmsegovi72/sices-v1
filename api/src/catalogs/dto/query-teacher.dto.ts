import { OptionalPositiveInt } from '@/common/decorators';

export class QueryTeacherDto {
  @OptionalPositiveInt({ fieldName: 'Año Escolar ID' })
  schoolYearId?: number;

  @OptionalPositiveInt({ fieldName: 'Semestre ID' })
  semesterId?: number;

  @OptionalPositiveInt({ fieldName: 'Periodo Semestral ID' })
  semiannualPeriodId?: number;
}
