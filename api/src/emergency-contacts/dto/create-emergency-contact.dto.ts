import { IntersectionType, PickType } from '@nestjs/mapped-types';
import { RequiredPositiveInt } from '@/common/decorators';
import { ContactFieldsDto, PersonalFieldsDto } from '@/common/dtos';

// create-emergency-contact.dto.ts
export class CreateEmergencyContactDto extends IntersectionType(
  // 🔹 PersonalFieldsDto → fullName
  PickType(PersonalFieldsDto, ['fullName'] as const),
  // 🔹 ContactFieldsDto → phone
  PickType(ContactFieldsDto, ['phone'] as const),
) {
  // 🔹 Exclusivos de EmergencyContact
  @RequiredPositiveInt({ fieldName: 'Persona' })
  personId!: number;

  @RequiredPositiveInt({ fieldName: 'Parentesco' })
  relationshipId!: number;
}
