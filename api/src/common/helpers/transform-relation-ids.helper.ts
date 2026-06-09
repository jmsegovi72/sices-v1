/* ============================================================================
 🛠️ transformRelationIds
 ------------------------------------------------------------------------------
 📌 Propósito:
 Convierte automáticamente cualquier campo con nombre terminado en "Id"
 (por ejemplo: stateId, municipalityId, roleId, etc.) en la sintaxis relacional
 que Prisma 7 exige para actualizar relaciones: { connect: { id } } o
 { disconnect: true }.

 Prisma 7 ya no permite actualizar claves foráneas directamente (FK), por lo que
 este helper evita errores como:
   ❌ Unknown argument `stateId`
   ❌ Unknown argument `municipalityId`

 ✔ Este helper:
   - Detecta todos los campos terminados en "Id"
   - Genera automáticamente la estructura relacional correcta
   - Elimina el campo original del objeto
   - Soporta valores numéricos (connect) y null (disconnect)
   - Funciona para cualquier modelo sin escribir lógica manual

 📌 Ejemplo:
   Entrada:
     { stateId: 4, municipalityId: 25 }

   Salida:
     {
       states: { connect: { id: 4 } },
       municipalities: { connect: { id: 25 } }
     }

 📌 Ubicación recomendada:
   src/common/helpers/transform-relation-ids.helper.ts

 ============================================================================ */

// 🔹 Mapeo: campo del DTO → nombre de la relación en Prisma
const RELATION_MAP: Record<string, string> = {
  stateId: 'states',
  municipalityId: 'municipalities', // opcional en el schema (Int?)
  roleId: 'roles',
  settlementTypeId: 'settlement_types',
  streetTypeId: 'street_types', // ← agregar
  zipCodeId: 'zip_codes', // ← agregar
  personId: 'persons', // ← agregar
  generationId: 'student_generations', // ← agregar
  educationalProgramId: 'educational_programs', // ← agregar
  statusId: 'student_status', // ← agregar
  offeredLevelId: 'school_offered_levels', // ← agregar
  maritalStatusId: 'marital_statuses', // ← agregar
  indigenousLangId: 'indigenous_languages', // ← agregar
  foreignLangId: 'foreign_languages', // ← agregar
  specialConditionId: 'special_conditions', // ← agregar
  relationshipId: 'contact_relationships',
  studentId: 'students', // ← agregar
  educationLevelId: 'education_levels', // ← agregar
  schoolOfOriginId: 'schools_of_origin', // ← agregar
  professionalDegreeId: 'professional_degrees', // ← agregar
  semesterId: 'semesters', // ← agregar
  semiannualPeriodId: 'semiannual_periods', // ← agregar
  // Staff / Academic Profile relations
  staffTypeId: 'staff_type',
  staffStatusId: 'staff_status',
  employmentTypeId: 'employment_type',
  employmentDurationId: 'employment_duration',
  responsibilityId: 'responsibilities',
  categoryId: 'categories',
  titleKey: 'titles',
  knowledgeAreaId: 'knowledge_areas',
  disciplineId: 'disciplines',
  staffTeachingProfileId: 'staff_teaching_profile',
  studyPlanId: 'study_plans',
  classId: 'classes',
  teachingLoadId: 'teaching_load',
  dayId: 'week_days',
  hourId: 'weekly_hours',
  classroomId: 'classrooms',
};

// 🔹 Relaciones que NO pueden ser null (son requeridas en el schema, sin "?")
const REQUIRED_RELATIONS = new Set([
  'stateId', // Int ← requerido
  'roleId', // Int ← requerido
  'streetTypeId', // Int ← requerido
  'zipCodeId', // Int ← requerido
  'personId', // Int ← requerido
  'generationId', // Int ← requerido
  'educationalProgramId', // Int ← requerido
  'statusId', // Int ← requerido (default 6)
  'offeredLevelId', // Int ← requerido
  'maritalStatusId', // Int ← requerido (default 1)
  'indigenousLangId', // Int ← requerido (default 1)
  'foreignLangId', // Int ← requerido (default 1)
  'specialConditionId', // Int ← requerido (default 1)
  'relationshipId',
  'studentId', // Int ← requerido
  'educationLevelId', // Int ← requerido
  'schoolOfOriginId', // Int ← requerido
  'professionalDegreeId', // Int ← requerido (default 1)
  'semesterId',
  'semiannualPeriodId',
  'staffTypeId',
  'staffStatusId',
  'employmentTypeId',
  'employmentDurationId',
  'responsibilityId',
  'categoryId',
  'titleKey',
  'knowledgeAreaId',
  'disciplineId',
  'staffTeachingProfileId',
  'studyPlanId',
  'classId',
  'teachingLoadId',
  'dayId',
  'hourId',
  'classroomId',
  // municipalityId NO va aquí porque es Int? (opcional)
]);
const EXCLUDE_FROM_TRANSFORM = new Set(['createdBy', 'updatedBy']); // 👈 Agregamos updatedBy aquí

export function transformRelationIds<T extends object>(
  data: T,
): Record<string, unknown> {
  const copy = { ...data } as Record<string, unknown>;
  const transformed: Record<string, unknown> = {};

  for (const key of Object.keys(copy)) {
    if (!RELATION_MAP[key] || EXCLUDE_FROM_TRANSFORM.has(key)) continue;

    const value = copy[key];

    if (value === null && REQUIRED_RELATIONS.has(key)) {
      throw new Error(
        `El campo '${key}' es una relación requerida y no puede ser null`,
      );
    }

    if (key === 'titleKey') {
      transformed[RELATION_MAP[key]] =
        value === null ? { disconnect: true } : { connect: { key: value } };
    } else {
      transformed[RELATION_MAP[key]] =
        value === null ? { disconnect: true } : { connect: { id: value } };
    }

    delete copy[key];
  }

  return { ...copy, ...transformed };
}
