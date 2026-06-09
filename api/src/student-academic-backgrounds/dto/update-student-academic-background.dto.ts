import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentAcademicBackgroundDto } from './create-student-academic-background.dto';

export class UpdateStudentAcademicBackgroundDto extends PartialType(
  CreateStudentAcademicBackgroundDto,
) {}
