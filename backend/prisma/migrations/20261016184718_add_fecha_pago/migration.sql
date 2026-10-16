-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- Los pagos que ya existian se fechan con la fecha de su venta
UPDATE "Pago" SET "creadoEn" = "Venta"."creadoEn" FROM "Venta" WHERE "Pago"."ventaId" = "Venta"."id";