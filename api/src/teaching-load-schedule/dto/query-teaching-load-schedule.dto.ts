import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { OptionalNonEmptyString } from '@/common/decorators';
import { ClassFieldsDto, PersonalFieldsDto, QueryBaseDto } from '@/common/dtos';

export class QueryTeachingLoadScheduleDto extends IntersectionType(
  PartialType(
    PickType(PersonalFieldsDto, ['curp', 'fullName', 'gender'] as const),
  ),
  PartialType(PickType(ClassFieldsDto, ['classCode'] as const)),
  QueryBaseDto,
) {
  @OptionalNonEmptyString({ fieldName: 'Nombre de la materia' })
  subjectName?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre del aula' })
  classroomName?: string;

  @OptionalNonEmptyString({ fieldName: 'Nombre del día' })
  day?: string;

  @OptionalNonEmptyString({ fieldName: 'Rango de hora' })
  hour?: string;

  @OptionalNonEmptyString({ fieldName: 'Ciclo escolar' })
  schoolYear?: string;

  @OptionalNonEmptyString({ fieldName: 'Periodo semestral' })
  semiannualPeriod?: string;
}
