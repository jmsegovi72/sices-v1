import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StudentsService } from './src/students/students.service';

async function main() {
  console.log('Bootstrapping NestJS app context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(StudentsService);

  try {
    console.log('Calling studentsService.findMany({ page: 1, limit: 15 })...');
    const result = await service.findMany({
      page: 1,
      limit: 15,
    });
    console.log('Result status:', result.success);
    console.log('Result message:', result.message);
    console.log('Result total records:', result.meta?.totalRecords);
    console.log('Result data length:', result.data?.length);
    if (result.data && result.data.length > 0) {
      console.log('First student:', result.data[0]);
    }
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await app.close();
  }
}

main();
