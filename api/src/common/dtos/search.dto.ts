import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import {
  isValidCct,
  isValidClassCode,
  isValidCurp,
  isValidEmail,
  isValidFolio,
  isValidIntegerId,
  isValidSemiannualPeriod,
  isValidStudentCode,
} from '../helpers';
import { SearchType } from '../types';

export class SearchDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;

    // 🔹 1. Limpieza inicial
    const trimmed = String(value).trim();

    // =========================================================
    // 🔹 2. Prefijos explícitos (solo campos ambiguos)
    // =========================================================

    // 📘 Matrícula escolar
    if (/^sc[:\-]?/i.test(trimmed)) {
      const studentCode = trimmed.replace(/^sc[:\-]?/i, '');

      if (!isValidStudentCode(studentCode)) {
        throw new BadRequestException(
          `La matrícula |${studentCode}| no cumple el formato oficial.`,
        );
      }

      return {
        type: 'studentCode',
        value: studentCode,
      };
    }

    // =========================================================
    // 🔹 3. Detección automática inteligente
    // =========================================================

    if (isValidIntegerId(trimmed)) {
      return {
        type: 'id',
        value: Number(trimmed),
      };
    }

    if (isValidEmail(trimmed)) {
      return {
        type: 'email',
        value: trimmed.toLowerCase(),
      };
    }

    if (isValidCurp(trimmed)) {
      return {
        type: 'curp',
        value: trimmed.toUpperCase(),
      };
    }

    if (isValidFolio(trimmed)) {
      return {
        type: 'folio',
        value: trimmed.toUpperCase(),
      };
    }

    if (isValidClassCode(trimmed)) {
      return {
        type: 'classCode',
        value: trimmed.toUpperCase(),
      };
    }

    if (isValidSemiannualPeriod(trimmed)) {
      return {
        type: 'semiannualPeriod',
        value: trimmed.toUpperCase(),
      };
    }
    if (isValidCct(trimmed)) {
      return {
        type: 'cct',
        value: trimmed.toUpperCase(),
      };
    }
    // =========================================================
    // 🔹 4. Fallback búsqueda textual
    // =========================================================

    return {
      type: 'text',
      value: trimmed,
    };
  })
  search?: { type: SearchType | 'text'; value: any };
}
