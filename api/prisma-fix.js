const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('schema.prisma not found at:', schemaPath);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

const viewStudentRegex = /(view\s+ViewStudent\s*\{[\s\S]*?\})/;
const match = schema.match(viewStudentRegex);

if (match) {
  let viewBlock = match[1];

  // Reemplazar el campo id
  viewBlock = viewBlock.replace(
    /id\s+(Decimal|BigInt|Int\?)\s+@unique\s+@default\(0\)(?:\s+@db\.Decimal\(\d+,\s*\d+\))?/,
    'id                 Int     @unique @default(0) @db.UnsignedInt'
  );

  // Reemplazar el campo personId
  viewBlock = viewBlock.replace(
    /personId\s+(Decimal|BigInt|Int\?)\s+@default\(0\)\s+@map\("person_id"\)(?:\s+@db\.Decimal\(\d+,\s*\d+\))?/,
    'personId           Int     @default(0) @map("person_id") @db.UnsignedInt'
  );

  schema = schema.replace(viewStudentRegex, viewBlock);
}

// Reemplazar campos de edad (age y employeeAge) de BigInt a Int en todo el archivo schema.prisma
schema = schema.replace(/\b(age|employeeAge)\s+BigInt(\??)/g, (match) => {
  return match.replace('BigInt', 'Int');
});

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('✅ schema.prisma automatically fixed for ViewStudent columns, age and employeeAge fields.');
