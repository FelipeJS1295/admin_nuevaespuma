import { PrismaClient, TipoMovimiento } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Borrando ventas y todo lo relacionado...');

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Devolver al stock lo que descontaron las ventas (antes de borrar los movimientos)
    const movimientosVenta = await tx.movimientoStock.findMany({
      where: { tipo: TipoMovimiento.VENTA },
    });

    const aDevolver = new Map<string, { bodegaId: number; productoId: number; cantidad: number }>();
    for (const m of movimientosVenta) {
      const clave = `${m.bodegaId}-${m.productoId}`;
      const actual = aDevolver.get(clave) ?? { bodegaId: m.bodegaId, productoId: m.productoId, cantidad: 0 };
      actual.cantidad += -m.cantidad; // los movimientos de venta son negativos, se devuelve el valor positivo
      aDevolver.set(clave, actual);
    }

    for (const d of aDevolver.values()) {
      await tx.stock.upsert({
        where: { bodegaId_productoId: { bodegaId: d.bodegaId, productoId: d.productoId } },
        update: { cantidad: { increment: d.cantidad } },
        create: { bodegaId: d.bodegaId, productoId: d.productoId, cantidad: d.cantidad },
      });
    }

    // 2. Borrar la venta y todo lo que cuelga de ella
    const pagos = await tx.pago.deleteMany();
    const items = await tx.ventaItem.deleteMany();
    const ventas = await tx.venta.deleteMany();

    // 3. Borrar los movimientos de stock de tipo VENTA
    const movimientos = await tx.movimientoStock.deleteMany({
      where: { tipo: TipoMovimiento.VENTA },
    });

    // 4. Borrar los abonos y dejar en cero la deuda de todos los clientes
    const abonos = await tx.abono.deleteMany();
    const clientes = await tx.cliente.updateMany({
      where: { creditoUsado: { not: 0 } },
      data: { creditoUsado: 0 },
    });

    return {
      ventas: ventas.count,
      items: items.count,
      pagos: pagos.count,
      movimientos: movimientos.count,
      abonos: abonos.count,
      clientesRestablecidos: clientes.count,
      stockRestaurado: aDevolver.size,
    };
  });

  console.log('Listo:');
  console.log(`- Ventas borradas: ${resultado.ventas}`);
  console.log(`- Ítems de venta borrados: ${resultado.items}`);
  console.log(`- Pagos borrados: ${resultado.pagos}`);
  console.log(`- Movimientos de venta borrados: ${resultado.movimientos}`);
  console.log(`- Abonos borrados: ${resultado.abonos}`);
  console.log(`- Clientes con deuda restablecida a $0: ${resultado.clientesRestablecidos}`);
  console.log(`- Registros de stock restaurados: ${resultado.stockRestaurado}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());