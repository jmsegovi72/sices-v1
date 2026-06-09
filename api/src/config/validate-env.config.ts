// src/common/config/validate-env.config.ts
import { envSchema } from './env.validation.config';

export function validateEnv(config: Record<string, any>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    // Imprimimos el error bonito como ya lo tienes
    console.error('❌ Error en variables de entorno:');

    // Mostramos los errores específicos
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });

    // En lugar de process.exit(1), lanzamos el error
    // Esto permite que NestJS lo capture y limpie recursos antes de cerrar
    throw new Error('Configuración de entorno inválida');
  }

  return result.data;
}
