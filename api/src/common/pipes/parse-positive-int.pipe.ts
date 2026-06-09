import { BadRequestException, PipeTransform } from '@nestjs/common';
import { APP_MESSAGES } from '@/common/constants';

/**
 * 🔢 ParsePositiveIntPipe
 *
 * Valida que el parámetro:
 * - Sea numérico
 * - Sea entero
 * - Sea mayor a 0
 *
 * Uso:
 * @Param('id', ParsePositiveIntPipe) id: number
 */
export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: string): number {
    const val = Number(value);

    if (!Number.isInteger(val) || val <= 0) {
      throw new BadRequestException(APP_MESSAGES.error.VALIDATION.INVALID_ID);
    }

    return val;
  }
}
