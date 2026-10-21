import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { calcularDeudaVencida, hoyEnChile } from '../clientes/deuda-vencida';
import { MedioPago, TipoMovimiento, TipoDocumento, Prisma } from '@prisma/client';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVentaDto, usuarioId?: number) {
        const { bodegaId, clienteId, items, pagos, tipoDocumento } = dto;
    const numeroDocumento = dto.numeroDocumento?.trim() || undefined;

    // El tipo y el número van juntos: o se indican los dos, o ninguno
    if ((tipoDocumento && !numeroDocumento) || (!tipoDocumento && numeroDocumento)) {
      throw new BadRequestException('Indica el tipo de documento y su número, o deja ambos vacíos');
    }

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
      const cantidad = item.cantidad ?? 1;
      const subtotal = producto.precio * item.espesorCm * cantidad;
      return {
        productoId: producto.id,
        espesorCm: item.espesorCm,
        cantidad,
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
    // Si el cliente es "con factura", todos sus pagos llevan IVA, sin importar lo que llegue
    const aplicaIva = (p: { conIva?: boolean }) => (cliente?.conFactura ? true : !!p.conIva);

    const pagosCalculados = pagos.map((p) => {
      const conIva = aplicaIva(p);
      const iva = conIva ? Math.round(p.monto * TASA_IVA) : 0;
      return {
        medioPago: p.medioPago,
        monto: p.monto,
        conIva,
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
      // Si la venta deja al cliente sobre su límite de crédito, no se puede realizar
      if (montoAfectaCredito > disponible) {
        throw new BadRequestException(
          `No se puede realizar la venta: ${cliente.nombre} está en su límite de crédito ` +
            `(disponible: $${Math.max(0, disponible).toLocaleString('es-CL')}, ` +
            `esta venta necesita: $${montoAfectaCredito.toLocaleString('es-CL')}).`,
        );
      }
    }

    // Vencimiento: solo aplica cuando esta venta le suma deuda al cliente
    let fechaVencimiento: Date | null = null;
    if (montoAfectaCredito > 0 && cliente) {
      const hoy = hoyEnChile();

      // La fecha que viene en la venta o, si no viene, hoy + los días de crédito del cliente
      let fechaTexto = dto.fechaVencimiento;
      if (!fechaTexto && cliente.diasCredito > 0) {
        const calculada = new Date(`${hoy}T00:00:00Z`);
        calculada.setUTCDate(calculada.getUTCDate() + cliente.diasCredito);
        fechaTexto = calculada.toISOString().slice(0, 10);
      }
      if (!fechaTexto) {
        throw new BadRequestException(
          `Indica la fecha de vencimiento: ${cliente.nombre} no tiene días de crédito definidos.`,
        );
      }
      if (fechaTexto < hoy) {
        throw new BadRequestException('La fecha de vencimiento no puede ser anterior a hoy.');
      }
      fechaVencimiento = new Date(`${fechaTexto}T00:00:00Z`);
      if (isNaN(fechaVencimiento.getTime())) {
        throw new BadRequestException('La fecha de vencimiento no es válida.');
      }

      // No se vende a crédito a un cliente con deuda vencida
      const ventasDelCliente = await this.prisma.venta.findMany({
        where: { clienteId: cliente.id },
        select: {
          id: true,
          creadoEn: true,
          fechaVencimiento: true,
          saldoPendiente: true,
          pagos: { select: { medioPago: true, total: true } },
        },
      });
      const deuda = calcularDeudaVencida(cliente.creditoUsado, ventasDelCliente);
      if (deuda.vencida) {
        throw new BadRequestException(
          `No se puede realizar la venta: ${cliente.nombre} tiene deuda vencida ` +
            `($${deuda.montoVencido.toLocaleString('es-CL')}, vencida hace ${deuda.diasVencida} día(s)). ` +
            'Debe pagarla antes de comprar a crédito.',
        );
      }
    }

    // 6. Ejecutar todo en una transacción
    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          bodegaId,
          clienteId: clienteId ?? null,
          usuarioId: usuarioId ?? null,
          tipoDocumento: tipoDocumento ?? null,
          numeroDocumento: numeroDocumento ?? null,
          fechaVencimiento,
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
          update: { cantidad: { decrement: item.espesorCm * item.cantidad } },
          create: { bodegaId, productoId: item.productoId, cantidad: -(item.espesorCm * item.cantidad) },
        });

        await tx.movimientoStock.create({
          data: {
            bodegaId,
            productoId: item.productoId,
            tipo: TipoMovimiento.VENTA,
            cantidad: -(item.espesorCm * item.cantidad),
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

  findAll(filtros: { desde?: string; hasta?: string; cliente?: string; estado?: string; documento?: string }) {
    const { desde, hasta, cliente, estado, documento } = filtros;
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

        // Número de factura o nota de venta (coincidencia parcial, sin importar mayúsculas)
    if (documento && documento.trim()) {
      where.numeroDocumento = { contains: documento.trim(), mode: 'insensitive' };
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
    const venta = await this.prisma.venta.findUnique({ where: { id: ventaId }, include: { cliente: true } });
    if (!venta) throw new NotFoundException(`Venta con id ${ventaId} no encontrada`);

    if (monto > venta.saldoPendiente + 0.01) {
      throw new BadRequestException(
        `El monto ($${monto}) es mayor al saldo pendiente de la venta ($${venta.saldoPendiente})`,
      );
    }

    const TASA_IVA = 0.19;
    // Si el cliente de la venta es "con factura", el pago siempre lleva IVA
    const aplicaIva = venta.cliente?.conFactura ? true : conIva;
    const iva = aplicaIva ? Math.round(monto * TASA_IVA) : 0;
    const total = monto + iva;

    return this.prisma.$transaction(async (tx) => {
      const pago = await tx.pago.create({
        data: { ventaId, medioPago, monto, conIva: aplicaIva, iva, total },
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
          update: { cantidad: { increment: item.espesorCm * item.cantidad } },
          create: { bodegaId: venta.bodegaId, productoId: item.productoId, cantidad: item.espesorCm * item.cantidad },
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

  async registrarDocumento(id: number, tipoDocumento: TipoDocumento, numeroDocumento: string) {
    // Solo se registra si la venta aún no tiene documento (así no se pisa uno existente)
    const resultado = await this.prisma.venta.updateMany({
      where: { id, numeroDocumento: null },
      data: { tipoDocumento, numeroDocumento },
    });

    if (resultado.count === 0) {
      const existe = await this.prisma.venta.findUnique({ where: { id }, select: { id: true } });
      if (!existe) throw new NotFoundException(`Venta con id ${id} no encontrada`);
      throw new BadRequestException('Esta venta ya tiene un documento registrado');
    }

    return { id, tipoDocumento, numeroDocumento };
  }
}