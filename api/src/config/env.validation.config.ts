import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  LOG_PRETTY: z.string().transform((val) => val === 'true'),
  // Usamos una validación descriptiva para evitar el warning de .url()
  DATABASE_URL: z.string().min(1).startsWith('mysql://', {
    message: 'DATABASE_URL debe empezar con mysql://',
  }),
  DB_CONNECTION_LIMIT: z.coerce.number().default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().default(60000),
  JWT_SECRET: z.string().min(10, {
    message: 'JWT_SECRET debe tener al menos 10 caracteres.',
  }),
  JWT_EXPIRATION: z.string().regex(/^\d+[smhd]$/, {
    message: 'JWT_EXPIRATION debe ser algo como "10m", "4h", "7d".',
  }),
  JWT_FIRST_LOGIN_EXPIRATION: z.string().regex(/^\d+[smhd]$/, {
    message: 'JWT_FIRST_LOGIN_EXPIRATION debe ser algo como "10m", "1h".',
  }),
  DEFAULT_PAGINATION_LIMIT: z.coerce.number().default(10),

  DEFAULT_CLASS_CAPACITY: z.coerce
    .number()
    .int()
    .min(1, {
      message: 'DEFAULT_CLASS_CAPACITY debe ser un número entero positivo.',
    })
    .default(25),
});

export type EnvVars = z.infer<typeof envSchema>;
