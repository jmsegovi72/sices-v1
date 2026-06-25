/**
 * 📦 Módulos del sistema (control de acceso por dominio)
 *
 * 🔹 Representan áreas funcionales del sistema
 * 🔹 Se usan para permisos granulares (AuthModule)
 * 🔹 NO representan acciones ni catálogos
 */
export enum SystemModules {
  // 🔹 Core
  USERS = 'USERS',
  PERSONS = 'PERSONS',

  // 🔹 Académico
  GRADES = 'GRADES', // Calificaciones
  ENROLLMENTS = 'ENROLLMENT', // Inscripción / reinscripción

  // 🔹 Futuro (opcional, puedes agregarlos después)
  CLASSES = 'CLASSES',
  ZIP_CODES = 'ZIP_CODES',
  ADDRESSES = 'ADDRESSES',
  STUDENTS = 'STUDENTS',
  SCHOOLS_OF_ORIGIN = 'SCHOOLS_OF_ORIGIN',
  DEMOGRAPHICS = 'DEMOGRAPHICS',
  EMERGENCY_CONTACTS = 'EMERGENCY_CONTACTS',
  STUDENT_ACADEMIC_BACKGROUNDS = 'STUDENT_ACADEMIC_BACKGROUNDS',
  STAFF = 'STAFF',
  TEACHING_LOAD = 'TEACHING_LOAD',
  DOCUMENTS = 'DOCUMENTS',
}
