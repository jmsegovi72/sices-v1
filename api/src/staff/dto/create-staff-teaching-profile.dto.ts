import {
  OptionalBoolean,
  OptionalNonEmptyString,
  RequiredPositiveInt,
} from '@/common/decorators';

export class CreateStaffTeachingProfileDto {
  // 🔹 ID de Personal
  @RequiredPositiveInt({ fieldName: 'ID de Personal' })
  staffId!: number;

  // 🔹 Frente a grupo (opcional al crear, por defecto true en la base de datos)
  @OptionalBoolean({ fieldName: 'Frente a grupo' })
  isClassroomTeacher?: boolean;

  // 🔹 Nivel en el que imparte clases (opcional al crear, por defecto "Licenciatura" en la base de datos)
  @OptionalNonEmptyString({
    fieldName: 'Nivel en el que imparte clases',
    max: 45,
  })
  levelTaught?: string;
}
