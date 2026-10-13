import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarProduccionDto } from './dto/registrar-produccion.dto';
import { TipoMovimiento } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // Trae el stock de todas las bodegas, con nombre de bodega y producto incluidos
  findAll() {
    return this.prisma.stock.findMany({
      include: {
        bodega: true,
        producto: true,
      },
    });
  }

  // Trae el historial de movimientos, más recientes primero
  findMovimientos() {
    return this.prisma.movimientoStock.findMany({
      include: {
        bodega: true,
        producto: true,
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
  }

  private async validarBodegaYProducto(bodegaId: number, productoId: number) {
    const bodega = await this.prisma.bodega.findUnique({ where: { id: bodegaId } });
    if (!bodega) throw new NotFoundException(`Bodega con id ${bodegaId} no encontrada`);

    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new NotFoundException(`Producto con id ${productoId} no encontrado`);

    return { bodega, producto };
  }

  async registrarProduccion(dto: RegistrarProduccionDto) {
    const { bodegaId, productoId, cantidadBloques, alturaBloqueCm, observacion } = dto;
    await this.validarBodegaYProducto(bodegaId, productoId);

    const cmTotales = cantidadBloques * alturaBloqueCm;

    const [stockActualizado] = await this.prisma.$transaction([
      this.prisma.stock.upsert({
        where: { bodegaId_productoId: { bodegaId, productoId } },
        update: { cantidad: { increment: cmTotales } },
        create: { bodegaId, productoId, cantidad: cmTotales },
      }),
      this.prisma.movimientoStock.create({
        data: {
          bodegaId,
          productoId,
          tipo: TipoMovimiento.PRODUCCION,
          cantidad: cmTotales,
          observacion: observacion ?? `${cantidadBloques} bloque(s) de ${alturaBloqueCm}cm`,
        },
      }),
    ]);

    return stockActualizado;
  }
}