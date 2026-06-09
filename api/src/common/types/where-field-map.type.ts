export type SearchType =
  | 'id'
  | 'email'
  | 'curp'
  | 'folio'
  | 'classCode'
  | 'semiannualPeriod'
  | 'studentCode'
  | 'cct'
  | 'phone';

export type TypeWhereFieldMap = {
  type: SearchType; // lo que viene en tu DTO
  field: string; // nombre real de la propiedad en el where
};
