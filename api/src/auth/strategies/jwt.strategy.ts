import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces';

/**
 * 🔐 Estrategia JWT para autenticación con Passport.
 *
 * Esta clase permite validar automáticamente cualquier petición
 * que incluya un token JWT en el encabezado `Authorization: Bearer <token>`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor que configura la estrategia JWT.
   *
   * @param authService Servicio de autenticación que valida usuarios.
   * @param configService Servicio de configuración (para leer variables de entorno).
   */
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      /**
       * 🔑 Clave secreta usada para verificar la firma del token JWT.
       * Se obtiene desde el archivo `.env` mediante ConfigService.
       * Ejemplo: JWT_SECRET=mysecretkey123
       */
      secretOrKey: configService.get('JWT_SECRET') as string,

      /**
       * 📦 Indica a Passport de dónde debe extraer el token JWT.
       * En este caso, desde el encabezado HTTP: "Authorization: Bearer <token>"
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  /**
   * ✅ Método que Passport ejecuta automáticamente después de validar el token.
   *
   * @param payload Contenido del token JWT (según `JwtPayload` interface).
   * @returns El usuario autenticado o lanza un error si no es válido.
   */
  async validate(payload: JwtPayload) {
    // Extraemos el ID del usuario desde el token
    const { id } = payload;

    /**
     * Usamos el AuthService para buscar el usuario en la base de datos
     * y asegurarnos de que aún existe y está activo.
     */
    const user = await this.authService.validateUser(id);

    /**
     * 🚀 Passport inyecta este objeto `user` automáticamente
     * en `req.user` para todos los controladores protegidos por `AuthGuard()`.
     */
    return user;
  }
}
