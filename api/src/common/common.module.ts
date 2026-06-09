import { Global, Module } from '@nestjs/common';
import { ErrorHandlerService } from './services/error-handler.service';

@Global() // 🌎 Hace que el ErrorHandler esté disponible en todo el SICES V3
@Module({
  providers: [ErrorHandlerService],
  exports: [ErrorHandlerService],
})
export class CommonModule {}
