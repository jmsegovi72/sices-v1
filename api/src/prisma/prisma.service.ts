import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    // 1. ELIMINAMOS el pool manual de mysql2.
    // 2. Pasamos la URL directamente al adaptador.
    // Esto es mucho más robusto para entornos de desarrollo.
    const adapter = new PrismaMariaDb(databaseUrl!);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ], // Simplificamos logs para evitar ruido
    });
  }

  async onModuleInit() {
    try {
      // Forzamos la conexión
      await this.$connect();
      this.logger.log(
        '✅ SICES V3: Conexión directa establecida exitosamente.',
      );
    } catch (error) {
      this.logger.error('🚨 SICES V3: Error de conexión persistente:', error);
      // No lanzamos el throw aquí para que la app no se muera y podamos debuguear
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
