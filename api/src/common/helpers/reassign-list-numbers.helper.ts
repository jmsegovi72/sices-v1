// helpers/reassign-list-numbers.helper.ts
import { Prisma } from '@prisma/client';

export async function reassignListNumbers(
  tx: Prisma.TransactionClient,
  classId: number,
): Promise<void> {
  // 🔹 1. Obtener enrollments ordenados por apellidos y nombre
  const enrollments = await tx.enrollment.findMany({
    where: { classId },
    select: {
      id: true,
      students: {
        select: {
          persons: {
            select: {
              firstName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
        },
      },
    },
    orderBy: [
      { students: { persons: { firstLastName: 'asc' } } },
      { students: { persons: { secondLastName: 'asc' } } },
      { students: { persons: { firstName: 'asc' } } },
    ],
  });

  // 🔹 2. Actualizar listNumber en lote
  const updates = enrollments.map((enrollment, index) =>
    tx.enrollment.update({
      where: { id: enrollment.id },
      data: { listNumber: index + 1 },
    }),
  );

  await Promise.all(updates);
}
