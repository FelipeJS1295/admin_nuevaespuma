-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "limiteCredito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditoUsado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_rut_key" ON "Cliente"("rut");
