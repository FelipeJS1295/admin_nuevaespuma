/*
  Warnings:

  - Added the required column `total` to the `Pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Venta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "conIva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL;
