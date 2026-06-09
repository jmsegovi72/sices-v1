import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CommonModule } from '@/common';
import { PrismaModule } from '@/prisma';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/*============================================================
 🧩 MÓDULO: AuthModule
============================================================*/
/**
 * 📦 Módulo de autenticación que agrupa toda la lógica relacionada con:
 * - Inicio de sesión y emisión de tokens JWT
 * - Validación de autenticación en rutas protegidas
 * - Cambio de contraseña
 * - Validación de estado del usuario
 *
 * Este módulo integra los siguientes componentes:
 * - **AuthService** → Lógica de negocio de autenticación
 * - **AuthController** → Endpoints REST relacionados con `/auth`
 * - **JwtStrategy** → Estrategia Passport para validar JWT
 *
 * 🔐 También configura e inyecta:
 * - **JwtModule** → Firma y verificación de tokens JWT
 * - **PassportModule** → Estrategia de autenticación base
 * - **PrismaModule** → Acceso a base de datos mediante Prisma
 * - **CommonModule** → Servicios y utilidades comunes
 */
@Module({
  controllers: [AuthController], // Controlador de autenticación
  providers: [AuthService, JwtStrategy], // Servicios y estrategia JWT
  imports: [
    /*------------------------------------------------------------
      🪪 PassportModule: registra la estrategia base JWT
    ------------------------------------------------------------*/
    PassportModule.register({ defaultStrategy: 'jwt' }),

    /*------------------------------------------------------------
      🔑 JwtModule: configuración dinámica del JWT
    ------------------------------------------------------------*/
    JwtModule.registerAsync({
      imports: [ConfigModule], // Permite leer variables desde .env
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Clave secreta usada para firmar tokens
        secret: configService.get('JWT_SECRET'),

        // Tiempo de expiración configurable (por defecto 4h)
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '4h') as any,
        },
      }),
    }),

    /*------------------------------------------------------------
      🧱 PrismaModule: acceso a base de datos
    ------------------------------------------------------------*/
    PrismaModule,

    /*------------------------------------------------------------
      ⚙️ CommonModule: utilidades compartidas (errores, helpers)
    ------------------------------------------------------------*/
    CommonModule,
  ],

  /*------------------------------------------------------------
    🚪 Exports: módulos reutilizables en otras partes del sistema
  ------------------------------------------------------------*/
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
