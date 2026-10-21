-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN     "cantidadDespachada" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Despacho" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Despacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DespachoItem" (
    "id" SERIAL NOT NULL,
    "despachoId" INTEGER NOT NULL,
    "ventaItemId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "DespachoItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Despacho" ADD CONSTRAINT "Despacho_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despacho" ADD CONSTRAINT "Despacho_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoItem" ADD CONSTRAINT "DespachoItem_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "Despacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoItem" ADD CONSTRAINT "DespachoItem_ventaItemId_fkey" FOREIGN KEY ("ventaItemId") REFERENCES "VentaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "VentaItem" SET "cantidadDespachada" = "cantidad";