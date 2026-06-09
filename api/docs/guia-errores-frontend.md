# Guía de Integración: Manejo Unificado de Errores (Frontend)

Esta guía documenta cómo el backend de **SICES V3** procesa y responde ante situaciones de error y cómo el frontend debe capturar, procesar y mostrar estos mensajes al usuario.

---

## 1. El Formato Único de Respuesta (ApiResponse)

Gracias al filtro global de excepciones (`HttpExceptionFilter`), **todos los errores del servidor** sin excepción (errores de negocio, validaciones de inputs/DTOs y caídas del servidor) retornan el mismo formato unificado:

```typescript
export interface ApiResponse<T = any> {
  success: boolean;        // Siempre false en errores
  status: 'error';         // Literal 'error'
  statusCode: number;      // Código de estado HTTP (400, 401, 403, 404, 409, 500)
  message: string;         // Frase redactada lista para mostrar al usuario
  
  // Metadatos estructurados (opcionales)
  error?: {
    code: string;          // Código técnico (ej. 'BAD_REQUEST', 'CONFLICT', 'NOT_FOUND')
    details?: any;         // Detalles técnicos o arreglo original de validaciones de DTO
    invalidField?: string; // Campo que causó el conflicto (si aplica)
    providedValue?: any;   // Valor enviado que fue rechazado (si aplica)
  };
}
```

---

## 2. Tipos de Errores y Concatenación Automática

El backend realiza una **concatenación automática e inteligente** en la propiedad `message` para que el frontend no tenga que hacer trabajo de carpintería:

### A. Errores de Validación (Inputs del DTO / ValidationPipe)
Si el usuario envía datos vacíos, formatos incorrectos o campos no permitidos, el servidor unifica todas las alertas de los campos en un solo párrafo legible y ordenado dentro de `message`.
*   **Ejemplo de respuesta:**
    ```json
    {
      "success": false,
      "status": "error",
      "statusCode": 400,
      "message": "El formato del código de clase no es válido. Ejemplo: HIS-01-2024. El campo Alumno es requerido y debe ser un número entero positivo.",
      "error": {
        "code": "BAD_REQUEST",
        "details": [
          "El formato del código de clase no es válido. Ejemplo: HIS-01-2024.",
          "El campo Alumno es requerido y debe ser un número entero positivo."
        ]
      }
    }
    ```

### B. Errores de Negocio (Conflictos, Regresiones o Inactividad)
Si el error ocurre debido a reglas del sistema (ej. intentar inscribir a un alumno a un semestre anterior al que ya cursó, carrera incorrecta o alumno dado de baja).
*   **Ejemplo de respuesta:**
    ```json
    {
      "success": false,
      "status": "error",
      "statusCode": 409,
      "message": "Inscripción denegada: El estudiante Juan Pérez ya ha cursado el semestre 4. No puede inscribirse en un semestre anterior (3).",
      "error": {
        "code": "CONFLICT",
        "invalidField": "semesterId",
        "providedValue": 3
      }
    }
    ```

---

## 3. Implementación Sugerida en Frontend (Axios / Fetch Interceptor)

Para facilitar el desarrollo, el frontend debe normalizar cualquier error usando un interceptor. Aquí tienes una propuesta en TypeScript/JavaScript:

```typescript
// Contrato normalizado para el estado del frontend
export interface FrontendError {
  success: false;
  statusCode: number;
  message: string;              // Mostrar siempre este texto en el Toast o Modal
  validationErrors?: string[];   // (Opcional) Lista de campos inválidos para pintar viñetas
  invalidField?: string;        // (Opcional) Input específico a pintar de rojo (ej. "studentCode")
  errorCode?: string;           // (Opcional) Código para flujos (ej. "UNAUTHORIZED")
}

/**
 * Normaliza los errores provenientes de Axios o Fetch
 */
export function normalizeError(error: any): FrontendError {
  const defaultMessage = "Ocurrió un error inesperado. Por favor, contacte al administrador.";
  
  // 1. Si no hay respuesta del servidor (Error de red)
  if (!error.response) {
    return {
      success: false,
      statusCode: 0,
      message: "No se pudo establecer conexión con el servidor. Verifique su internet.",
    };
  }

  const responseData = error.response.data;
  const statusCode = error.response.status || responseData?.statusCode || 500;

  // 2. Si es un error del DTO (message es un array en la respuesta original de NestJS)
  if (responseData && Array.isArray(responseData.message)) {
    return {
      success: false,
      statusCode,
      message: "Se detectaron problemas en los datos ingresados.",
      validationErrors: responseData.message,
      errorCode: 'BAD_REQUEST',
    };
  }

  // 3. Si es un error controlado (con la estructura ApiResponse y qwikMessageResponse)
  if (responseData && typeof responseData === 'object') {
    return {
      success: false,
      statusCode,
      message: responseData.message || defaultMessage,
      validationErrors: responseData.error?.details && Array.isArray(responseData.error.details) 
        ? responseData.error.details 
        : undefined,
      invalidField: responseData.error?.invalidField || undefined,
      errorCode: responseData.error?.code || undefined,
    };
  }

  // 4. Fallback general del sistema
  return {
    success: false,
    statusCode,
    message: error.message || defaultMessage,
  };
}
```

---

## 4. Buenas Prácticas de Interfaz (UX) en el Frontend

1.  **Mostrar siempre `message`**: El texto que se encuentra en la propiedad `message` ya está procesado, concatenado y listo para ser inyectado en tus componentes de notificación (Toast, SweetAlert o Modales). **Evita armar o concatenar textos manualmente en el frontend.**
2.  **Pintar inputs inválidos con `invalidField`**: Si el error contiene `invalidField` (ej. `"studentCode"`), puedes buscar el control correspondiente en tu formulario de React/Qwik/Vue y agregarle una clase CSS de error (ej. `border-red-500`) para mejorar la experiencia del usuario.
3.  **Redirecciones automáticas con `errorCode`**:
    *   Si `errorCode === 'UNAUTHORIZED'` (HTTP 401), limpia la sesión (localStorage/cookies) y redirige inmediatamente a la pantalla de Login.
    *   Si `errorCode === 'FORBIDDEN'` (HTTP 403), redirige a una pantalla de "Acceso Denegado" o muestra un aviso de falta de permisos.

---

## 5. Traducción de IDs Técnicos a Nombres Legibles en el Frontend (Ej. `personId`)

Cuando la capturista selecciona un registro de un catálogo (como elegir una persona de un dropdown/select por su nombre) y ocurre un error de unicidad (por ejemplo, duplicar un usuario o un contacto de emergencia para esa misma persona), el backend responde con el valor de la clave primaria (`providedValue: 2`) y un mensaje técnico como `"El valor '2' ya está asignado al campo 'ID de persona'."`.

Para evitar consultas redundantes a la base de datos en el servidor, **el frontend es el encargado de interceptar este error y traducir el ID al nombre que el usuario seleccionó**, ya que tiene esa información en memoria (por ejemplo, en las opciones del dropdown).

### Ejemplo de Implementación en React / Qwik / Angular / Vue

Al capturar el error al enviar el formulario (por ejemplo, al crear un contacto de emergencia o usuario):

```typescript
function handleSubmit() {
  api.post('/emergency-contacts', formData)
    .catch((error) => {
      const normalized = normalizeError(error);

      // Interceptar conflicto específico de ID de persona
      if (normalized.invalidField === 'personId' && normalized.statusCode === 409) {
        // Buscar el objeto persona en el estado o lista de opciones cargadas
        const personaSeleccionada = listadoPersonas.find(p => p.id === formData.personId);
        const nombrePersona = personaSeleccionada 
          ? `${personaSeleccionada.firstName} ${personaSeleccionada.firstLastName}` 
          : 'seleccionada';

        // Personalizar el mensaje según el módulo
        normalized.message = `La persona '${nombrePersona}' ya tiene un contacto de emergencia registrado.`;
      }

      // Mostrar el mensaje amigable en el Toast o Alert
      showToast(normalized.message, 'error');
    });
}
```

Esto permite al frontend mostrar mensajes con nombres legibles al instante sin necesidad de que el backend realice consultas adicionales de búsqueda.

