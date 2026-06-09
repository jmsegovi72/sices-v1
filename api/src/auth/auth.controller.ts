import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import type { UserFromView } from '@/common/types';
import { AuthService } from './auth.service';
import { Auth, GetUser } from './decorators';
import { ChangePasswordDto } from './dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*============================================================
    🔑 POST /auth/login
  ============================================================*/
  /**
   * 🔑 Iniciar sesión
   *
   * Recibe:
   * - username (correo electrónico)
   * - password
   *
   * Respuestas:
   * - ✔ Login exitoso → { user, token }
   * - 🔐 Primer login → { requiresPasswordChange, message, token }
   *
   * Notas:
   * - El campo `username` corresponde al email
   * - No revela si el usuario existe o no
   */

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }
  /*============================================================
    🔐 PATCH /auth/change-password
  ============================================================*/
  /**
   * 🔐 Cambio de contraseña
   *
   * Requiere:
   * - Usuario autenticado (@Auth)
   *
   * Casos:
   * - Primer login (token temporal)
   * - Cambio normal de contraseña
   *
   * Seguridad:
   * - El token puede ser temporal (isTemp)
   */
  @Patch('change-password')
  @Auth() // 👈 Valida el JWT y que el usuario esté activo en la View
  async changePassword(
    // 🚀 Usamos tu nuevo alias de tipo para el objeto plano de la vista
    @GetUser() user: UserFromView,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    // Solo enviamos el ID y el DTO, el servicio se encarga del resto
    return this.authService.changePassword(user.id, changePasswordDto);
  }
  /*============================================================
    🩺 GET /auth/check-status
  ============================================================*/
  /**
   * 🩺 Verifica sesión actual
   *
   * Retorna:
   * - Usuario autenticado
   * - Nuevo token (refresh implícito)
   *
   * Uso:
   * - Mantener sesión activa en frontend
   */
  @Get('check-status')
  @Auth()
  checkAuthStatus(@GetUser() user: UserFromView) {
    // Llamamos al puente público que ahora devuelve { user, token }
    return this.authService.checkStatus(user);
  }
}
