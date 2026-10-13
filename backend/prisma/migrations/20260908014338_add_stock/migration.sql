-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('PRODUCCION', 'VENTA', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE');

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "bodegaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" SERIAL NOT NULL,
    "bodegaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_bodegaId_productoId_key" ON "Stock"("bodegaId", "productoId");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
