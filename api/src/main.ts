import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Importación clave
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // 1. Creamos la app (el ConfigModule ya validó todo dentro de AppModule)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // 2. Obtenemos el ConfigService para sacar las variables validadas
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const nodeEnv = configService.get<string>('NODE_ENV');

  // 3. Logger (Pino) - Se integra con el ciclo de vida de Nest
  app.useLogger(app.get(Logger));

  // En tu main.ts
  app.setGlobalPrefix('sices/v3');

  // Habilitar la carpeta de subidas estáticas
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // --- PIEZA DE VALIDACIÓN ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían datos de más
      transform: true, // Convierte tipos (ej. string a number en IDs)
      transformOptions: {
        enableImplicitConversion: true, // Facilita la conversión de tipos
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // 4. Arranque con datos validados
  await app.listen(port || 3000);

  // Usamos el logger de Pino para informar el éxito
  const appLogger = new (require('@nestjs/common').Logger)('Bootstrap');
  appLogger.log(`🚀 SICES V3 corriendo en modo ${nodeEnv} en puerto ${port}`);
}

bootstrap();
