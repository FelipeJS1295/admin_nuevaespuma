import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const passwordPlano = process.env.ADMIN_PASSWORD;

  if (!email || !passwordPlano) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD antes de ejecutar este script.');
  }

  const passwordEncriptada = await bcrypt.hash(passwordPlano, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: passwordEncriptada,
      nombre: 'Administrador Master',
      rol: Rol.ADMIN_MASTER,
    },
  });

  console.log('Usuario listo:', usuario.email);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());