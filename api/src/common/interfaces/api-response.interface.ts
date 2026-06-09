/**
 * 📦 Interfaz Unificada de Respuesta para la API
 * @template T Tipo de dato de la respuesta
 */
export interface ApiResponse<T = any> {
  success: boolean;

  status: 'success' | 'error' | 'warning';
  statusCode: number;

  message: string;

  // Datos
  data?: T;

  // 🔥 Metadatos completos (paginación)
  meta?: {
    totalRecords?: number; // Total en BD
    records?: number; // Registros devueltos en esta página
    page?: number;
    totalPages?: number;
    limit?: number;
  };

  // Error estructurado
  error?: {
    code: string;
    details?: string | any;
    invalidField?: string;
    providedValue?: any;
  };

  // Token (auth)
  token?: string;
}
