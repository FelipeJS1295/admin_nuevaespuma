-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "diasCredito" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "fechaVencimiento" DATE;
