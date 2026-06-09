import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryStudentDto } from './src/students/dto/query-student.dto';

async function main() {
  const query = {
    page: '1',
    limit: '15',
  };

  console.log('Parsing query to DTO:', query);
  const dto = plainToClass(QueryStudentDto, query);
  console.log('DTO parsed:', dto);

  const errors = await validate(dto);
  if (errors.length > 0) {
    console.log('Validation failed:', errors);
  } else {
    console.log('Validation passed!');
  }
}

main();
