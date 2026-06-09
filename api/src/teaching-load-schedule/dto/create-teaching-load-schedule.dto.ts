import { RequiredPositiveInt } from '@/common/decorators';

export class CreateTeachingLoadScheduleDto {
  @RequiredPositiveInt({ fieldName: 'Carga académica' })
  teachingLoadId!: number;

  @RequiredPositiveInt({ fieldName: 'Día de la semana' })
  dayId!: number;

  @RequiredPositiveInt({ fieldName: 'Hora/Módulo' })
  hourId!: number;

  @RequiredPositiveInt({ fieldName: 'Aula' })
  classroomId!: number;
}
