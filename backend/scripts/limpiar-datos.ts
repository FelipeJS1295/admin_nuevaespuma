import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Borrando datos (se mantienen los usuarios)...');

  // Orden importante: primero las tablas "hijas", luego las "padres"
  await prisma.pago.deleteMany();
  await prisma.ventaItem.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.producto.deleteMany();

  console.log('Listo. Todo borrado excepto los usuarios.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());