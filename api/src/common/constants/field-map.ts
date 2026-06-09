/**
 * @file field-map.ts
 * @description
 * Mapeo de constraints de MariaDB (obtenidos vía SHOW INDEX) a nombres legibles.
 * Sincronizado con la estructura del SICES V3.
 */

/**
 * Mapeo de constraints de MariaDB (obtenidos vía SHOW INDEX) a nombres legibles.
 * Sincronizado con la estructura del SICES V3.
 */

export const fieldMap: Record<string, string> = {
  // === academic_disciplines ===
  fk_academic_disciplines_offered_level: 'offeredLevelId',
  name_UNIQUE: 'name',

  // === addresses ===
  fk_addresses_created_by: 'createdBy',
  fk_addresses_person: 'personId',
  fk_addresses_street_type: 'streetTypeId',
  fk_addresses_updated_by: 'updatedBy',
  fk_addresses_zip_code: 'zipCodeId',
  uk_person_id: 'personId',

  // === classes ===
  fk_classes_created_by: 'createdBy',
  fk_classes_educational_program: 'educationalProgramId',
  fk_classes_semester: 'semesterId',
  fk_classes_semiannual_period: 'semiannualPeriodId',
  fk_classes_updated_by: 'updatedBy',
  uk_class_code: 'classCode',

  // === contact_relationships ===
  uk_contact_relationship_name: 'name',

  // === demographics ===
  fk_pd_creator: 'createdBy',
  fk_pd_foreign: 'foreignLanguageId',
  fk_pd_indigenous: 'indigenousLanguageId',
  fk_pd_marital: 'maritalStatusId',
  fk_pd_person: 'personId',
  fk_pd_special: 'specialConditionId',
  fk_pd_updater: 'updatedBy',
  uq_pd_person: 'personId',

  // === education_levels ===
  level_UNIQUE: 'level',

  // === educational_programs ===

  ep_key_UNIQUE: 'epKey',
  fk_ep_academic_discipline: 'academicDisciplineId',
  fk_ep_modality: 'modalityId',

  subes_key_UNIQUE: 'subesKey',

  // === emergency_contacts ===
  fk_pec_creator: 'createdBy',
  fk_pec_person: 'personId',
  fk_pec_relationship: 'relationshipId',
  fk_pec_updater: 'updatedBy',

  // === foreign_languages ===
  uk_foreign_language_name: 'name',

  // === indigenous_languages ===
  uk_indigenous_language_name: 'name',

  // === marital_statuses ===
  status_UNIQUE: 'status',

  // === modalities ===

  // === municipalities ===

  fk_municipality_state: 'stateId',

  // === persons ===
  curp_UNIQUE: 'curp',
  email_UNIQUE: 'personalEmail',
  fk_person_created_by: 'createdBy',
  fk_person_municipality: 'municipalityId',
  fk_person_state: 'stateId',
  fk_person_updated_by: 'updatedBy',
  rfc_UNIQUE: 'rfc',

  // === professional_degrees ===
  fk_professional_degrees_creator: 'createdBy',
  fk_professional_degrees_updater: 'updatedBy',
  uk_professional_degree_name: 'name',

  // === roles ===
  name: 'name',

  // === school_offered_levels ===
  uq_offered_level: 'offeredEducationLevel',

  // === school_years ===
  uk_school_year: 'schoolYear',

  // === schools_of_origin ===
  fk_schools_creator: 'createdBy',
  fk_schools_municipality: 'municipalityId',
  fk_schools_offered_level: 'offeredLevelId',
  fk_schools_updater: 'updatedBy',
  uk_schools_cct: 'cct',
  uk_schools_name: 'name',

  // === semesters ===
  uk_ordinal_number: 'ordinalNumber',
  uk_semester_number: 'number',

  // === semiannual_periods ===
  uk_semiannual_period: 'semiannualPeriod',

  // === settlement_types ===
  settlement_name_UNIQUE: 'settlementType',

  // === special_conditions ===
  uk_special_condition_name: 'name',

  // === states ===

  inegi_code_UNIQUE: 'inegiCode',

  // === student_academic_backgrounds ===
  fk_sab_creator: 'createdBy',
  fk_sab_degree: 'professionalDegreeId',
  fk_sab_school: 'schoolId',
  fk_sab_student: 'studentId',
  fk_sab_updater: 'updatedBy',
  uq_student_background_level: 'studentId',

  // === student_generations ===
  bachelor_degree_cycle_UNIQUE: 'bachelorDegreeCycle',
  cardinal_number_UNIQUE: 'cardinalNumber',
  masters_degree_cycle_UNIQUE: 'mastersDegreeCycle',
  ordinal_number_UNIQUE: 'ordinalNumber',

  // === student_status ===
  status_key_UNIQUE: 'statusKey',

  // === students ===
  code_number_UNIQUE: 'codeNumber',
  fk_students_created_by: 'createdBy',
  fk_students_educational_program_id: 'educationalProgramId',
  fk_students_generation_id: 'generationId',
  fk_students_person_id: 'personId',
  fk_students_status_id: 'statusId',
  fk_students_updated_by: 'updatedBy',
  institutional_mail_UNIQUE: 'institutionalMail',
  unique_person_educational_program: 'personId',

  // === user_types ===
  code_UNIQUE: 'code',

  // === users ===

  fk_user_person: 'personId',
  fk_user_role: 'roleId',
  fk_users_created_by: 'createdBy',
  fk_users_updated_by: 'updatedBy',
  fk_users_user_type: 'userTypeId',
  person_id_UNIQUE: 'personId',

  // === zip_codes ===
  fk_zip_codes_created_by: 'createdBy',
  fk_zip_codes_municipality: 'municipalityId',
  fk_zip_codes_settlement_type: 'settlementTypeId',
  fk_zip_codes_updated_by: 'updatedBy',
  uk_zip_code_settlement_type_municipality: 'zipCode',

  class_code: 'classCode', // ← AGREGAR ESTA LÍNEA
};
