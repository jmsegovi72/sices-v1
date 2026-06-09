import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  private readonly rootUploadPath = join(process.cwd(), 'uploads');

  /**
   * Guarda un archivo de forma física en el disco.
   *
   * @param file Archivo subido por Multer (en memoria)
   * @param folder Subcarpeta destino (ej. 'users', 'students')
   * @param filename Nombre que tendrá el archivo (ej. 'CURP.png')
   * @param allowedMimeTypes Tipos MIME permitidos (por defecto solo image/png)
   * @param maxSizeInMb Tamaño máximo permitido en Megabytes (por defecto 5MB)
   * @returns La ruta relativa para guardar en la base de datos (ej. '/uploads/users/CURP.png')
   */
  async saveFile(
    file: Express.Multer.File,
    folder: string,
    filename: string,
    allowedMimeTypes: string[] = ['image/png'],
    maxSizeInMb = 5,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException(
        'No se ha proporcionado ningún archivo para subir.',
      );
    }

    // 🔹 1. Validar tipos de archivo (MIME Types)
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Formato de archivo inválido (${file.mimetype}). Tipos permitidos: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // 🔹 2. Validar tamaño máximo
    const maxSizeBytes = maxSizeInMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `El tamaño del archivo (${(file.size / 1024 / 1024).toFixed(2)} MB) supera el límite permitido de ${maxSizeInMb} MB.`,
      );
    }

    // 🔹 3. Preparar rutas físicas
    const destinationDir = join(this.rootUploadPath, folder);
    const destinationPath = join(destinationDir, filename);

    try {
      // 🔹 4. Asegurar que exista el directorio destino
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      // 🔹 5. Guardar físicamente el archivo en disco (sobrescribe si existe)
      await fs.promises.writeFile(destinationPath, file.buffer);

      // 🔹 6. Retornar la ruta relativa que se guardará en la base de datos
      return `/uploads/${folder}/${filename}`;
    } catch (error) {
      throw new BadRequestException(
        `Ocurrió un error al intentar escribir el archivo en disco: ${error.message}`,
      );
    }
  }
}
