import { OptionalPositiveInt, OptionalNonEmptyString } from '@/common/decorators';

export class QueryStudyPlanDto {
  @OptionalPositiveInt({ fieldName: 'Programa Educativo ID' })
  educationalProgramId?: number;

  @OptionalPositiveInt({ fieldName: 'Semestre ID' })
  semesterId?: number;

  @OptionalNonEmptyString({ fieldName: 'Código de clase' })
  classCode?: string;
}
