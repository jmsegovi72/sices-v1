import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  try {
    console.log('Querying counts in viewStudent by currentSemester...');
    const semesterCounts = await prisma.viewStudent.groupBy({
      by: ['currentSemester'],
      _count: {
        id: true
      }
    });

    console.log('SEMESTER COUNTS IN VIEWSTUDENT:');
    for (const item of semesterCounts) {
      console.log(`- Semester ${item.currentSemester}: ${item._count.id} students`);
    }

    console.log('\nQuerying sample student names in semester 1...');
    const semester1Students = await prisma.viewStudent.findMany({
      where: { currentSemester: 1 },
      select: { id: true, fullName: true, currentSemester: true, statusDescription: true }
    });
    console.log(`Total students found with currentSemester = 1: ${semester1Students.length}`);
    for (const s of semester1Students) {
      console.log(`- ID: ${s.id}, Name: ${s.fullName}, Semester: ${s.currentSemester}, Status: ${s.statusDescription}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

main();
