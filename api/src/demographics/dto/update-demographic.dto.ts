import { PartialType } from '@nestjs/mapped-types';
import { CreateDemographicDto } from './create-demographic.dto';

export class UpdateDemographicDto extends PartialType(CreateDemographicDto) {}
