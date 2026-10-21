import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDespachoDto } from './dto/crear-despacho.dto';

@Injectable()
export class DespachosService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista ventas con sus cantidades (sin montos). Por defecto solo las que tienen algo pendiente.
  async listar(filtros: { estado?: string; desde?: string; hasta?: string; cliente?: string }) {
    const { estado, desde, hasta, cliente } = filtros;
    const where: any = {};

    if (desde || hasta) {
      where.creadoEn = {};
      if (desde) where.creadoEn.gte = new Date(`${desde}T00:00:00`);
      if (hasta) where.creadoEn.lte = new Date(`${hasta}T23:59:59.999`);
    }
    if (cliente?.trim()) {
      where.cliente = {
        OR: [
          { nombre: { contains: cliente.trim(), mode: 'insensitive' } },
          { rut: { contains: cliente.trim(), mode: 'insensitive' } },
        ],
      };
    }

    const ventas = await this.prisma.venta.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        creadoEn: true,
        bodega: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            espesorCm: true,
            cantidad: true,
            cantidadDespachada: true,
            producto: { select: { nombre: true, densidad: true } },
          },
        },
        despachos: {
          orderBy: { creadoEn: 'desc' },
          select: {
            id: true,
            creadoEn: true,
            observacion: true,
            usuario: { select: { nombre: true } },
            items: { select: { cantidad: true, ventaItemId: true } },
          },
        },
      },
    });

    const resultado = ventas.map((v) => {
      const items = v.items.map((i) => ({
        ...i,
        pendiente: i.cantidad - i.cantidadDespachada,
      }));
      const piezasPendientes = items.reduce((a, i) => a + i.pendiente, 0);
      const piezasDespachadas = items.reduce((a, i) => a + i.cantidadDespachada, 0);
      const estadoEntrega =
        piezasPendientes === 0 ? 'COMPLETO' : piezasDespachadas > 0 ? 'PARCIAL' : 'PENDIENTE';
      return { ...v, items, estadoEntrega };
    });

    return estado === 'todas' ? resultado : resultado.filter((v) => v.estadoEntrega !== 'COMPLETO');
  }

  async despachar(ventaId: number, dto: CrearDespachoDto, usuarioId?: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: { items: true },
    });
    if (!venta) throw new NotFoundException(`Venta ${ventaId} no encontrada`);

    // Juntar por ítem (por si llega repetido) y validar contra lo pendiente
    const porItem = new Map<number, number>();
    for (const it of dto.items) {
      porItem.set(it.ventaItemId, (porItem.get(it.ventaItemId) ?? 0) + it.cantidad);
    }
    for (const [ventaItemId, cantidad] of porItem) {
      const item = venta.items.find((i) => i.id === ventaItemId);
      if (!item) throw new BadRequestException(`El ítem ${ventaItemId} no pertenece a la venta ${ventaId}`);
      const pendiente = item.cantidad - item.cantidadDespachada;
      if (cantidad > pendiente) {
        throw new BadRequestException(`No se pueden despachar ${cantidad} piezas: solo quedan ${pendiente} pendientes`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const despacho = await tx.despacho.create({
        data: {
          ventaId,
          usuarioId: usuarioId ?? null,
          observacion: dto.observacion?.trim() || null,
          items: {
            create: Array.from(porItem, ([ventaItemId, cantidad]) => ({ ventaItemId, cantidad })),
          },
        },
      });

      for (const [ventaItemId, cantidad] of porItem) {
        // Se revalida dentro de la transacción para evitar despachar de más si dos personas lo hacen a la vez
        const actualizado = await tx.ventaItem.updateMany({
          where: { id: ventaItemId, cantidadDespachada: { lte: venta.items.find((i) => i.id === ventaItemId)!.cantidad - cantidad } },
          data: { cantidadDespachada: { increment: cantidad } },
        });
        if (actualizado.count === 0) {
          throw new BadRequestException('Las cantidades pendientes cambiaron, recarga e intenta de nuevo');
        }
      }

      return despacho;
    });
  }
}
