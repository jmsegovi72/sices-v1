import { PartialType } from '@nestjs/mapped-types';
import { CreateTeachingLoadDto } from './create-teaching-load.dto';

export class UpdateTeachingLoadDto extends PartialType(CreateTeachingLoadDto) {}
