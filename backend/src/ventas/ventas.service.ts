import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { MedioPago, TipoMovimiento, Prisma } from '@prisma/client';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVentaDto, usuarioId?: number) {
    const { bodegaId, clienteId, items, pagos } = dto;

    // 1. Validar bodega
    const bodega = await this.prisma.bodega.findUnique({ where: { id: bodegaId } });
    if (!bodega) throw new NotFoundException(`Bodega con id ${bodegaId} no encontrada`);

    // 2. Validar cliente (si viene)
    const cliente = clienteId
      ? await this.prisma.cliente.findUnique({ where: { id: clienteId } })
      : null;
    if (clienteId && !cliente) throw new NotFoundException(`Cliente con id ${clienteId} no encontrado`);

    // 3. Traer productos y calcular subtotales
    const productoIds = items.map((i) => i.productoId);
    const productos = await this.prisma.producto.findMany({ where: { id: { in: productoIds } } });

    const itemsCalculados = items.map((item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) throw new NotFoundException(`Producto con id ${item.productoId} no encontrado`);
      const subtotal = producto.precio * item.espesorCm;
      return {
        productoId: producto.id,
        espesorCm: item.espesorCm,
        precioUnitario: producto.precio,
        subtotal,
      };
    });

    const subtotal = itemsCalculados.reduce((acc, i) => acc + i.subtotal, 0);

    // 4. La suma de los montos NETOS de los pagos no puede superar el subtotal (pero puede ser menor: saldo pendiente)
    const sumaMontosPagos = pagos.reduce((acc, p) => acc + p.monto, 0);
    if (sumaMontosPagos - subtotal > 0.01) {
      throw new BadRequestException(
        `La suma de los pagos ($${sumaMontosPagos}) no puede ser mayor al subtotal de la venta ($${subtotal})`,
      );
    }
    const saldoPendiente = Math.max(0, subtotal - sumaMontosPagos);

    // Calcular el IVA de cada pago (19%) y armar los pagos finales
    const TASA_IVA = 0.19;
    const pagosCalculados = pagos.map((p) => {
      const iva = p.conIva ? Math.round(p.monto * TASA_IVA) : 0;
      return {
        medioPago: p.medioPago,
        monto: p.monto,
        conIva: !!p.conIva,
        iva,
        total: p.monto + iva,
      };
    });

    const ivaTotal = pagosCalculados.reduce((acc, p) => acc + p.iva, 0);
    const total = subtotal + ivaTotal;

    // 5. El saldo pendiente y los pagos "Crédito del cliente" requieren cliente, y se suman al crédito usado
    const montoCreditoPorPagos = pagosCalculados
      .filter((p) => p.medioPago === MedioPago.CREDITO_CLIENTE)
      .reduce((acc, p) => acc + p.total, 0);

    const montoAfectaCredito = montoCreditoPorPagos + saldoPendiente;

    let superaLimite = false;
    if (montoAfectaCredito > 0) {
      if (!cliente) {
        throw new BadRequestException(
          'Debes seleccionar un cliente para dejar saldo pendiente o usar "Crédito del cliente"',
        );
      }
      const disponible = cliente.limiteCredito - cliente.creditoUsado;
      // Se permite superar el límite, pero se marca como advertencia (no se bloquea)
      superaLimite = montoAfectaCredito > disponible;
    }

    // 6. Ejecutar todo en una transacción
    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          bodegaId,
          clienteId: clienteId ?? null,
          usuarioId: usuarioId ?? null,
          subtotal,
          iva: ivaTotal,
          total,
          saldoPendiente,
          items: { create: itemsCalculados },
          pagos: { create: pagosCalculados },
        },
        include: { items: true, pagos: true },
      });

      // Descontar stock y registrar movimiento por cada ítem
      for (const item of itemsCalculados) {
        await tx.stock.upsert({
          where: { bodegaId_productoId: { bodegaId, productoId: item.productoId } },
          update: { cantidad: { decrement: item.espesorCm } },
          create: { bodegaId, productoId: item.productoId, cantidad: -item.espesorCm },
        });

        await tx.movimientoStock.create({
          data: {
            bodegaId,
            productoId: item.productoId,
            tipo: TipoMovimiento.VENTA,
            cantidad: -item.espesorCm,
            observacion: `Venta #${venta.id}`,
          },
        });
      }

      // Aumentar el crédito usado del cliente, si corresponde (crédito por pago + saldo pendiente)
      if (montoAfectaCredito > 0 && clienteId) {
        await tx.cliente.update({
          where: { id: clienteId },
          data: { creditoUsado: { increment: montoAfectaCredito } },
        });
      }

      return { ...venta, superaLimite };
    });
  }

  findAll(filtros: { desde?: string; hasta?: string; cliente?: string; estado?: string }) {
    const { desde, hasta, cliente, estado } = filtros;
    const where: Prisma.VentaWhereInput = {};

    // Rango de fechas (el día "hasta" se incluye completo)
    if (desde || hasta) {
      const rangoFecha: Prisma.DateTimeFilter = {};
      if (desde) rangoFecha.gte = new Date(`${desde}T00:00:00`);
      if (hasta) rangoFecha.lte = new Date(`${hasta}T23:59:59.999`);
      where.creadoEn = rangoFecha;
    }

    // Cliente por nombre o RUT
    if (cliente && cliente.trim()) {
      where.cliente = {
        OR: [
          { nombre: { contains: cliente.trim(), mode: 'insensitive' } },
          { rut: { contains: cliente.trim(), mode: 'insensitive' } },
        ],
      };
    }

    // Estado de pago
    if (estado === 'pendientes') where.saldoPendiente = { gt: 0 };
    if (estado === 'pagadas') where.saldoPendiente = { lte: 0 };

    return this.prisma.venta.findMany({
      where,
      include: {
        bodega: true,
        cliente: true,
        items: { include: { producto: true } },
        pagos: true,
      },
      orderBy: { creadoEn: 'desc' },
      take: 500,
    });
  }

  findDelDia() {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    return this.prisma.venta.findMany({
      where: { creadoEn: { gte: inicioDelDia } },
      include: {
        bodega: true,
        cliente: true,
        items: { include: { producto: true } },
        pagos: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        bodega: true,
        cliente: true,
        items: { include: { producto: true } },
        pagos: true,
      },
    });
    if (!venta) throw new NotFoundException(`Venta con id ${id} no encontrada`);
    return venta;
  }

  async registrarPagoPendiente(ventaId: number, monto: number, medioPago: MedioPago, conIva: boolean) {
    const venta = await this.prisma.venta.findUnique({ where: { id: ventaId } });
    if (!venta) throw new NotFoundException(`Venta con id ${ventaId} no encontrada`);

    if (monto > venta.saldoPendiente + 0.01) {
      throw new BadRequestException(
        `El monto ($${monto}) es mayor al saldo pendiente de la venta ($${venta.saldoPendiente})`,
      );
    }

    const TASA_IVA = 0.19;
    const iva = conIva ? Math.round(monto * TASA_IVA) : 0;
    const total = monto + iva;

    return this.prisma.$transaction(async (tx) => {
      const pago = await tx.pago.create({
        data: { ventaId, medioPago, monto, conIva, iva, total },
      });

      await tx.venta.update({
        where: { id: ventaId },
        data: { saldoPendiente: { decrement: monto }, total: { increment: total } },
      });

      if (venta.clienteId) {
        await tx.cliente.update({
          where: { id: venta.clienteId },
          data: { creditoUsado: { decrement: monto } },
        });
      }

      return pago;
    });
  }

  async eliminar(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { items: true, pagos: true },
    });
    if (!venta) throw new NotFoundException(`Venta con id ${id} no encontrada`);

    // Lo que esta venta le sumó a la deuda del cliente:
    // pagos con "Crédito del cliente" + el saldo pendiente que aún le queda
    const deudaDeLaVenta =
      venta.pagos
        .filter((p) => p.medioPago === MedioPago.CREDITO_CLIENTE)
        .reduce((acc, p) => acc + p.total, 0) + venta.saldoPendiente;

    await this.prisma.$transaction(async (tx) => {
      // 1. Devolver al stock lo que descontó cada ítem
      for (const item of venta.items) {
        await tx.stock.upsert({
          where: { bodegaId_productoId: { bodegaId: venta.bodegaId, productoId: item.productoId } },
          update: { cantidad: { increment: item.espesorCm } },
          create: { bodegaId: venta.bodegaId, productoId: item.productoId, cantidad: item.espesorCm },
        });
      }

      // 2. Borrar los movimientos de stock de esta venta
      await tx.movimientoStock.deleteMany({
        where: { tipo: TipoMovimiento.VENTA, observacion: `Venta #${id}` },
      });

      // 3. Borrar pagos, ítems y la venta
      await tx.pago.deleteMany({ where: { ventaId: id } });
      await tx.ventaItem.deleteMany({ where: { ventaId: id } });
      await tx.venta.delete({ where: { id } });

      // 4. Restar de la deuda del cliente lo que esta venta le había sumado
      if (venta.clienteId && deudaDeLaVenta > 0) {
        const cliente = await tx.cliente.findUnique({ where: { id: venta.clienteId } });
        if (cliente) {
          await tx.cliente.update({
            where: { id: cliente.id },
            data: { creditoUsado: Math.max(0, cliente.creditoUsado - deudaDeLaVenta) },
          });
        }
      }
    });

    return { eliminada: id };
  }
}