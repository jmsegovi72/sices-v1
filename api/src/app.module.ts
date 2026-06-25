import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importamos ConfigService
import { AppController } from './app.controller';
import { LoggerModule } from 'nestjs-pino';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ClassesModule } from './classes/classes.module';
import { validateEnv } from './config';
import { DemographicsModule } from './demographics/demographics.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { GradesModule } from './grades/grades.module';
import { PersonsModule } from './persons/persons.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolsOfOriginModule } from './schools-of-origin/schools-of-origin.module';
import { StaffModule } from './staff/staff.module';
import { DocumentsModule } from './documents/documents.module';
import { StudentAcademicBackgroundsModule } from './student-academic-backgrounds/student-academic-backgrounds.module';
import { StudentWithdrawalsModule } from './student-withdrawals/student-withdrawals.module';
import { StudentsModule } from './students/students.module';
import { TeachingLoadModule } from './teaching-load/teaching-load.module';
import { TeachingLoadScheduleModule } from './teaching-load-schedule/teaching-load-schedule.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { ZipCodesModule } from './zip-codes/zip-codes.module';

@Module({
  imports: [
    // 1. CONFIGURACIÓN: La pieza maestra de validación
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv, // <-- AGREGAMOS: Zod toma el control aquí
    }),
    PrismaModule,
    // 2. LOGGER: Configuración dinámica y segura
    LoggerModule.forRootAsync({
      // <-- CAMBIAMOS: Usamos forRootAsync
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const logPretty = config.get('LOG_PRETTY'); // Usamos tu variable validada

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport:
              !isProduction && logPretty
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                      ignore: 'pid,hostname',
                    },
                  }
                : undefined,
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    PersonsModule,
    ZipCodesModule,
    AddressesModule,
    StudentsModule,
    DocumentsModule,
    SchoolsOfOriginModule,
    DemographicsModule,
    EmergencyContactsModule,
    StudentAcademicBackgroundsModule,
    ClassesModule,
    EnrollmentsModule,
    StaffModule,
    TeachingLoadModule,
    TeachingLoadScheduleModule,
    GradesModule,
    StudentWithdrawalsModule,
    CatalogsModule,
    UploadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
