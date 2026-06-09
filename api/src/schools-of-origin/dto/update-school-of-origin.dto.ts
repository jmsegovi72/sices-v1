import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolOfOriginDto } from './create-school-of-origin.dto';

export class UpdateSchoolsOfOriginDto extends PartialType(
  CreateSchoolOfOriginDto,
) {}
