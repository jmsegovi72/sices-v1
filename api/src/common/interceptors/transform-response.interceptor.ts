import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatDate } from '../utils';

/* ============================================================
 🔍 TransformDataInterceptor
 ------------------------------------------------------------
 📌 Descripción:
 Este interceptor global (o de ruta) se encarga de
 transformar los datos de la respuesta *justo antes* de que
 sean enviados al cliente.

 Su principal propósito es solucionar dos problemas comunes
 al trabajar con Prisma y JSON:

 1.  **Error de BigInt**: JSON no soporta el tipo `bigint`
     (que Prisma usa a menudo para IDs o contadores). Este
     interceptor previene el error `TypeError: Do not know
     how to serialize a BigInt` convirtiendo todos los
     `bigint` a `Number`.
 2.  **Formato de Fechas**: Estandariza todos los objetos `Date`
     y campos específicos (como `birthDate`) al formato simple
     'yyyy-MM-dd', en lugar del formato ISO 8601 completo
     (ej. `2025-11-05T14:30:00.000Z`).

 🧠 Flujo:
 1️⃣ El interceptor se activa después de que el controlador/servicio
     retorna una respuesta (`next.handle()`).
 2️⃣ Usa el operador `map` de RxJS para "capturar" el `data`
     (la carga útil de la respuesta, ej. `ApiResponse<T>`).
 3️⃣ Utiliza un truco de `JSON.stringify` + `JSON.parse`
     para recorrer *profundamente* todo el objeto de respuesta.
 4️⃣ `JSON.stringify` usa una función "replacer" (reemplazador)
     que es llamada por cada `(key, value)` en el objeto:
 5️⃣  **Si `value` es `bigint`**: Lo convierte a `Number`.
 6️⃣  **Si `value` es un `Date` object**: Lo formatea a 'yyyy-MM-dd'.
 7️⃣  **Si `key` es `birthDate`**: Llama al helper `formatDate`
     (como un seguro adicional si el valor no era un objeto `Date`).
 8️⃣  **Si no**: Retorna el valor original.
 9️⃣ `JSON.parse` toma el string JSON (ya limpio y formateado)
     y lo convierte de nuevo en un objeto JavaScript que se
     envía al cliente.

 ⚙️ Parámetros:
 - _context: ExecutionContext - El contexto de la solicitud
   (marcado como `_` porque no se usa directamente).
 - next: CallHandler - El manejador que contiene el `Observable`
   de la respuesta del controlador.

 🧾 Retorna:
 - Observable<any>: Un `Observable` que emite el objeto de
   datos completamente transformado (JSON-safe y con
   fechas formateadas).

 🚨 Excepciones:
 - Este interceptor está diseñado para *prevenir* excepciones
   de serialización (como la de `BigInt`).

 💡 Ejemplos:
    Así se usa en un controlador (en un endpoint o en toda la clase):
   @Get()
   @UseInterceptors(TransformDataInterceptor)
   findAll() {
     return this.myService.findAll(); // <-- Devuelve datos con BigInt y Dates
   }

    --- Datos ANTES (del servicio) ---
    {
     "total": 15n,
     "data": [ { "id": 1n, "createdAt": new Date("2025-11-05...") } ]
    }

    --- Datos DESPUÉS (enviados al cliente) ---
    {
      "total": 15,
      "data": [ { "id": 1, "createdAt": "2025-11-05" } ]
    }
============================================================ */
@Injectable()
export class TransformDataInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) =>
        JSON.parse(
          JSON.stringify(data, (key, value) => {
            // Convertir BigInt a número
            if (typeof value === 'bigint') {
              return Number(value);
            }
            // Formatear date a 'yyyy-MM-dd'
            if (value instanceof Date) return value.toISOString().split('T')[0];
            // Formatear birthdate a 'yyyy-MM-dd'
            if (key === 'birthDate' && value) {
              return formatDate(value); //new Date(value).toISOString().split('T')[0];
            }
            return value; // Retornar el valor original si no se aplica transformación
          }),
        ),
      ),
    );
  }
}
