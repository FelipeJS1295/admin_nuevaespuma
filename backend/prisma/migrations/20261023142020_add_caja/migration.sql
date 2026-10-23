-- CreateEnum
CREATE TYPE "TipoCuadre" AS ENUM ('EFECTIVO', 'BANCO');

-- CreateTable
CREATE TABLE "SalidaCaja" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "concepto" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "usuarioId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalidaCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuadreCaja" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoCuadre" NOT NULL,
    "contado" DOUBLE PRECISION NOT NULL,
    "sistema" DOUBLE PRECISION NOT NULL,
    "diferencia" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "detalle" JSONB,
    "usuarioId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuadreCaja_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalidaCaja" ADD CONSTRAINT "SalidaCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadreCaja" ADD CONSTRAINT "CuadreCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
