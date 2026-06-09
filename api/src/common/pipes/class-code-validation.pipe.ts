// src/pipes/class-code-validation.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { REGEX } from '@/common/helpers'; // ← usar alias @/ en lugar de src/

@Injectable()
export class ClassCodeValidationPipe implements PipeTransform {
  transform(value: string) {
    if (!REGEX.CLASS_CODE.test(value)) {
      throw new BadRequestException(
        'El formato del |código de clase| no es válido. Ejemplo: HIS-01-2024.',
      );
    }
    return value.toUpperCase(); // ← normalizar a mayúsculas
  }
}
