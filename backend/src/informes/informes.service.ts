import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const formatoFecha = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD

@Injectable()
export class InformesService {
  constructor(private prisma: PrismaService) {}

  async ventas(desde?: string, hasta?: string) {
    // Si no se indica rango, usa desde el 1 del mes actual hasta hoy
    const ahora = new Date();
    const desdeFinal = desde || formatoFecha(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    const hastaFinal = hasta || formatoFecha(ahora);

    const ventas = await this.prisma.venta.findMany({
      where: {
        creadoEn: {
          gte: new Date(`${desdeFinal}T00:00:00`),
          lte: new Date(`${hastaFinal}T23:59:59.999`),
        },
      },
      include: {
        usuario: true,
        items: { include: { producto: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    // Totales generales
    const resumen = {
      cantidad: ventas.length,
      subtotal: ventas.reduce((acc, v) => acc + v.subtotal, 0),
      iva: ventas.reduce((acc, v) => acc + v.iva, 0),
      totalCobrado: ventas.reduce((acc, v) => acc + v.total, 0),
      saldoPendiente: ventas.reduce((acc, v) => acc + v.saldoPendiente, 0),
    };

    // Por día
    const porDiaMap = new Map<string, { fecha: string; cantidad: number; total: number }>();
    for (const v of ventas) {
      const fecha = formatoFecha(v.creadoEn);
      const actual = porDiaMap.get(fecha) ?? { fecha, cantidad: 0, total: 0 };
      actual.cantidad += 1;
      actual.total += v.total;
      porDiaMap.set(fecha, actual);
    }
    const porDia = Array.from(porDiaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Por producto (monto neto, sin IVA)
    const porProductoMap = new Map<
      number,
      { productoId: number; nombre: string; sku: string; densidad: number; cmVendidos: number; montoNeto: number }
    >();
    for (const v of ventas) {
      for (const item of v.items) {
        const actual = porProductoMap.get(item.productoId) ?? {
          productoId: item.productoId,
          nombre: item.producto.nombre,
          sku: item.producto.sku,
          densidad: item.producto.densidad,
          cmVendidos: 0,
          montoNeto: 0,
        };
        actual.cmVendidos += item.espesorCm;
        actual.montoNeto += item.subtotal;
        porProductoMap.set(item.productoId, actual);
      }
    }
    const porProducto = Array.from(porProductoMap.values()).sort((a, b) => b.montoNeto - a.montoNeto);

    // Por vendedor
    const porVendedorMap = new Map<string, { vendedor: string; cantidad: number; total: number }>();
    for (const v of ventas) {
      const vendedor = v.usuario?.nombre ?? 'Sin vendedor';
      const actual = porVendedorMap.get(vendedor) ?? { vendedor, cantidad: 0, total: 0 };
      actual.cantidad += 1;
      actual.total += v.total;
      porVendedorMap.set(vendedor, actual);
    }
    const porVendedor = Array.from(porVendedorMap.values()).sort((a, b) => b.total - a.total);

    return {
      desde: desdeFinal,
      hasta: hastaFinal,
      resumen,
      porDia,
      porProducto,
      porVendedor,
    };
  }

  async cuentasPorCobrar() {
    const clientes = await this.prisma.cliente.findMany({
      where: { creditoUsado: { gt: 0 } },
      include: {
        ventas: {
          where: { saldoPendiente: { gt: 0 } },
          select: { creadoEn: true, saldoPendiente: true },
          orderBy: { creadoEn: 'asc' },
        },
      },
      orderBy: { creditoUsado: 'desc' },
    });

    const ahora = new Date();
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    const detalle = clientes.map((c) => {
      const ventaMasAntigua = c.ventas[0]?.creadoEn ?? null;
      return {
        clienteId: c.id,
        nombre: c.nombre,
        rut: c.rut,
        activo: c.activo,
        limiteCredito: c.limiteCredito,
        deuda: c.creditoUsado,
        disponible: c.limiteCredito - c.creditoUsado,
        superaLimite: c.creditoUsado > c.limiteCredito,
        ventasPendientes: c.ventas.length,
        saldoEnVentas: c.ventas.reduce((acc, v) => acc + v.saldoPendiente, 0),
        diasVentaMasAntigua: ventaMasAntigua
          ? Math.floor((ahora.getTime() - ventaMasAntigua.getTime()) / MS_POR_DIA)
          : null,
      };
    });

    return {
      resumen: {
        clientesConDeuda: detalle.length,
        deudaTotal: detalle.reduce((acc, d) => acc + d.deuda, 0),
        clientesSobreLimite: detalle.filter((d) => d.superaLimite).length,
      },
      clientes: detalle,
    };
  }

  async inventario(desde?: string, hasta?: string) {
    // Si no se indica rango, usa desde el 1 del mes actual hasta hoy
    const ahora = new Date();
    const desdeFinal = desde || formatoFecha(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    const hastaFinal = hasta || formatoFecha(ahora);
    const rango = {
      gte: new Date(`${desdeFinal}T00:00:00`),
      lte: new Date(`${hastaFinal}T23:59:59.999`),
    };

    // Stock actual (foto de hoy, no depende del rango)
    const stock = await this.prisma.stock.findMany({
      include: { bodega: true, producto: true },
    });

    const porBodegaMap = new Map<
      number,
      {
        bodegaId: number;
        bodega: string;
        totalCm: number;
        productos: { productoId: number; nombre: string; sku: string; densidad: number; cantidad: number }[];
      }
    >();
    for (const s of stock) {
      const actual = porBodegaMap.get(s.bodegaId) ?? {
        bodegaId: s.bodegaId,
        bodega: s.bodega.nombre,
        totalCm: 0,
        productos: [],
      };
      actual.totalCm += s.cantidad;
      actual.productos.push({
        productoId: s.productoId,
        nombre: s.producto.nombre,
        sku: s.producto.sku,
        densidad: s.producto.densidad,
        cantidad: s.cantidad,
      });
      porBodegaMap.set(s.bodegaId, actual);
    }
    const porBodega = Array.from(porBodegaMap.values()).sort((a, b) => a.bodega.localeCompare(b.bodega));

    const stockNegativo = stock
      .filter((s) => s.cantidad < 0)
      .map((s) => ({
        bodega: s.bodega.nombre,
        producto: s.producto.nombre,
        cantidad: s.cantidad,
      }));

    // Movimientos del período, agrupados por tipo
    const movimientos = await this.prisma.movimientoStock.findMany({
      where: { creadoEn: rango },
    });

    const movimientosPorTipo = new Map<string, { tipo: string; cantidadMovimientos: number; totalCm: number }>();
    for (const m of movimientos) {
      const actual = movimientosPorTipo.get(m.tipo) ?? { tipo: m.tipo, cantidadMovimientos: 0, totalCm: 0 };
      actual.cantidadMovimientos += 1;
      actual.totalCm += m.cantidad;
      movimientosPorTipo.set(m.tipo, actual);
    }

    // Densidades más vendidas del período
    const itemsVendidos = await this.prisma.ventaItem.findMany({
      where: { venta: { creadoEn: rango } },
      include: { producto: true },
    });

    const densidadesMap = new Map<number, { densidad: number; cmVendidos: number; montoNeto: number }>();
    for (const item of itemsVendidos) {
      const densidad = item.producto.densidad;
      const actual = densidadesMap.get(densidad) ?? { densidad, cmVendidos: 0, montoNeto: 0 };
      actual.cmVendidos += item.espesorCm;
      actual.montoNeto += item.subtotal;
      densidadesMap.set(densidad, actual);
    }
    const densidadesMasVendidas = Array.from(densidadesMap.values()).sort((a, b) => b.cmVendidos - a.cmVendidos);

    return {
      desde: desdeFinal,
      hasta: hastaFinal,
      stockTotalCm: stock.reduce((acc, s) => acc + s.cantidad, 0),
      porBodega,
      stockNegativo,
      movimientosPorTipo: Array.from(movimientosPorTipo.values()),
      densidadesMasVendidas,
    };
  }

  async produccion(desde?: string, hasta?: string) {
    // Si no se indica rango, usa desde el 1 del mes actual hasta hoy
    const ahora = new Date();
    const desdeFinal = desde || formatoFecha(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    const hastaFinal = hasta || formatoFecha(ahora);

    const registros = await this.prisma.movimientoStock.findMany({
      where: {
        tipo: 'PRODUCCION',
        creadoEn: {
          gte: new Date(`${desdeFinal}T00:00:00`),
          lte: new Date(`${hastaFinal}T23:59:59.999`),
        },
      },
      include: { bodega: true, producto: true },
      orderBy: { creadoEn: 'asc' },
    });

    const resumen = {
      registros: registros.length,
      totalCm: registros.reduce((acc, r) => acc + r.cantidad, 0),
    };

    // Por día
    const porDiaMap = new Map<string, { fecha: string; registros: number; totalCm: number }>();
    for (const r of registros) {
      const fecha = formatoFecha(r.creadoEn);
      const actual = porDiaMap.get(fecha) ?? { fecha, registros: 0, totalCm: 0 };
      actual.registros += 1;
      actual.totalCm += r.cantidad;
      porDiaMap.set(fecha, actual);
    }
    const porDia = Array.from(porDiaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Por producto
    const porProductoMap = new Map<
      number,
      { productoId: number; nombre: string; sku: string; densidad: number; registros: number; totalCm: number }
    >();
    for (const r of registros) {
      const actual = porProductoMap.get(r.productoId) ?? {
        productoId: r.productoId,
        nombre: r.producto.nombre,
        sku: r.producto.sku,
        densidad: r.producto.densidad,
        registros: 0,
        totalCm: 0,
      };
      actual.registros += 1;
      actual.totalCm += r.cantidad;
      porProductoMap.set(r.productoId, actual);
    }
    const porProducto = Array.from(porProductoMap.values()).sort((a, b) => b.totalCm - a.totalCm);

    // Por densidad
    const porDensidadMap = new Map<number, { densidad: number; registros: number; totalCm: number }>();
    for (const r of registros) {
      const densidad = r.producto.densidad;
      const actual = porDensidadMap.get(densidad) ?? { densidad, registros: 0, totalCm: 0 };
      actual.registros += 1;
      actual.totalCm += r.cantidad;
      porDensidadMap.set(densidad, actual);
    }
    const porDensidad = Array.from(porDensidadMap.values()).sort((a, b) => a.densidad - b.densidad);

    // Por bodega
    const porBodegaMap = new Map<number, { bodegaId: number; bodega: string; registros: number; totalCm: number }>();
    for (const r of registros) {
      const actual = porBodegaMap.get(r.bodegaId) ?? {
        bodegaId: r.bodegaId,
        bodega: r.bodega.nombre,
        registros: 0,
        totalCm: 0,
      };
      actual.registros += 1;
      actual.totalCm += r.cantidad;
      porBodegaMap.set(r.bodegaId, actual);
    }
    const porBodega = Array.from(porBodegaMap.values()).sort((a, b) => b.totalCm - a.totalCm);

    return {
      desde: desdeFinal,
      hasta: hastaFinal,
      resumen,
      porDia,
      porProducto,
      porDensidad,
      porBodega,
    };
  }
}