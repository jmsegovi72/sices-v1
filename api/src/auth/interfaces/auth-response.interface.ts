import { User } from '@prisma/client';

export interface AuthResponse {
  token: string;
  user: User;
}
