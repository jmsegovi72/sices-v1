import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth(@Res() res: Response) {
    let dbStatus = 'DOWN';
    let statusCode = HttpStatus.OK; // Devolvemos 200 siempre para que el front reciba el JSON estructurado, o 503 si prefieres.

    try {
      // Consulta ultra rápida para verificar la salud de MySQL
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch (error) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    }

    return res.status(statusCode).json({
      status: dbStatus === 'UP' ? 'UP' : 'DOWN',
      services: {
        api: 'UP',
        database: dbStatus,
      },
    });
  }
}
