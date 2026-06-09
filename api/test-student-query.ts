import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function main() {
  console.log('Bootstrapping NestJS app context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('App context initialized successfully.');

  const prisma = app.get(PrismaService);
  try {
    console.log('Querying viewStudent count...');
    const count = await prisma.viewStudent.count();
    console.log('Total students in view:', count);

    console.log('Querying findMany with where: {}');
    const students = await prisma.viewStudent.findMany({
      take: 15,
      orderBy: [
        { firstLastName: 'asc' },
        { secondLastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
    console.log('Students returned:', students.length);
    if (students.length > 0) {
      console.log('First student sample:', {
        id: students[0].id,
        fullName: students[0].fullName,
        isActive: students[0].isActive,
      });
    }
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await app.close();
  }
}

main();
