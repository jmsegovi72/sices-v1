import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserFromView } from '@/common/types';

export const GetUser = createParamDecorator(
  /**
   * @param data - Ahora solo acepta llaves que REALMENTE existan en UserFromView
   */
  (data: keyof UserFromView | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user: UserFromView = req.user;

    if (!user) {
      throw new InternalServerErrorException(
        'Ningún usuario dentro de la petición. Asegúrese de que el AuthGuard esté configurado.',
      );
    }

    // Si data existe, devolvemos user['fullName'], user['roleName'], etc.
    return data ? user[data] : user;
  },
);
