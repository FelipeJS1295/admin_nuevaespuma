-- CreateTable
CREATE TABLE "Abono" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abono_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Abono" ADD CONSTRAINT "Abono_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
