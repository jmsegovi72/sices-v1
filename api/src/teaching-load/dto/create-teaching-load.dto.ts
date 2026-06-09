import { RequiredPositiveInt } from '@/common/decorators';

export class CreateTeachingLoadDto {
  @RequiredPositiveInt({ fieldName: 'Perfil docente' })
  staffTeachingProfileId!: number;

  @RequiredPositiveInt({ fieldName: 'Plan de estudios' })
  studyPlanId!: number;

  @RequiredPositiveInt({ fieldName: 'Clase' })
  classId!: number;
}
