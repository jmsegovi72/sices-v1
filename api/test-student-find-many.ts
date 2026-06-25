import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StudentsService } from './src/students/students.service';

async function main() {
  console.log('Bootstrapping NestJS context for semester query test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(StudentsService);

  try {
    const filters = {
      page: 1,
      limit: 75,
      semester: 1
    };
    
    console.log('Executing studentsService.findMany with filters:', filters);
    const result = await service.findMany(filters);
    console.log('SUCCESS:', result.success);
    console.log('META:', result.meta);
    console.log('DATA LENGTH:', result.data?.length);
    if (result.data && (result.data as any).length > 0) {
      console.log('Sample record semester:', (result.data as any)[0].currentSemester);
    }
  } catch (error) {
    console.error('Error caught during execution:', error);
  } finally {
    await app.close();
  }
}

main();
