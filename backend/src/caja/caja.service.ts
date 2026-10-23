import { BadRequestException, Injectable } from '@nestjs/common';
import { MedioPago, TipoCuadre } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearSalidaDto, CuadreBancoDto, CuadreEfectivoDto } from './dto/caja.dto';

const formatoFecha = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD
const soloFecha = (f: string) => new Date(`${f}T00:00:00.000Z`); // para columnas @db.Date
const fechaISO = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  // Plata que entró por los medios dados (pagos de ventas + abonos), hasta el fin del día indicado
  private async entradas(medios: MedioPago[], hastaFecha?: string, desdeFecha?: string) {
    const rango: { gte?: Date; lte?: Date } = {};
    if (desdeFecha) rango.gte = new Date(`${desdeFecha}T00:00:00`);
    if (hastaFecha) rango.lte = new Date(`${hastaFecha}T23:59:59.999`);
    const where = { medioPago: { in: medios }, ...(desdeFecha || hastaFecha ? { creadoEn: rango } : {}) };
    const [pagos, abonos] = await Promise.all([
      this.prisma.pago.aggregate({ where, _sum: { total: true } }),
      this.prisma.abono.aggregate({ where, _sum: { monto: true } }),
    ]);
    return (pagos._sum.total ?? 0) + (abonos._sum.monto ?? 0);
  }

  private async salidasHasta(hastaFecha: string) {
    const r = await this.prisma.salidaCaja.aggregate({
      where: { fecha: { lte: soloFecha(hastaFecha) } },
      _sum: { monto: true },
    });
    return r._sum.monto ?? 0;
  }

  // Efectivo que debería haber en caja hasta la fecha (entradas en efectivo - salidas)
  private async efectivoSistema(hastaFecha: string) {
    const [entradas, salidas] = await Promise.all([
      this.entradas([MedioPago.EFECTIVO], hastaFecha),
      this.salidasHasta(hastaFecha),
    ]);
    return entradas - salidas;
  }

  async resumen(desde?: string, hasta?: string) {
    const ahora = new Date();
    const desdeFinal = desde || formatoFecha(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    const hastaFinal = hasta || formatoFecha(ahora);

    const [efectivo, debito, transferencia, salidasPeriodo, saldoEfectivo, saldoBanco, salidas, cuadres] =
      await Promise.all([
        this.entradas([MedioPago.EFECTIVO], hastaFinal, desdeFinal),
        this.entradas([MedioPago.DEBITO], hastaFinal, desdeFinal),
        this.entradas([MedioPago.TRANSFERENCIA], hastaFinal, desdeFinal),
        this.prisma.salidaCaja.aggregate({
          where: { fecha: { gte: soloFecha(desdeFinal), lte: soloFecha(hastaFinal) } },
          _sum: { monto: true },
        }),
        this.efectivoSistema(hastaFinal),
        this.entradas([MedioPago.DEBITO, MedioPago.TRANSFERENCIA], hastaFinal),
        this.prisma.salidaCaja.findMany({
          where: { fecha: { gte: soloFecha(desdeFinal), lte: soloFecha(hastaFinal) } },
          orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
          include: { usuario: { select: { nombre: true } } },
        }),
        this.prisma.cuadreCaja.findMany({
          orderBy: { creadoEn: 'desc' },
          take: 20,
          include: { usuario: { select: { nombre: true } } },
        }),
      ]);

    return {
      desde: desdeFinal,
      hasta: hastaFinal,
      periodo: {
        efectivo,
        debito,
        transferencia,
        totalIngresado: efectivo + debito + transferencia,
        salidas: salidasPeriodo._sum.monto ?? 0,
      },
      // Acumulado hasta la fecha "hasta"
      saldoEfectivo,
      saldoBanco,
      salidas: salidas.map((s) => ({
        id: s.id,
        fecha: fechaISO(s.fecha),
        concepto: s.concepto,
        responsable: s.responsable,
        monto: s.monto,
        registradaPor: s.usuario?.nombre ?? null,
      })),
      cuadres: cuadres.map((c) => ({
        id: c.id,
        fecha: fechaISO(c.fecha),
        tipo: c.tipo,
        contado: c.contado,
        sistema: c.sistema,
        diferencia: c.diferencia,
        observaciones: c.observaciones,
        detalle: c.detalle,
        registradoPor: c.usuario?.nombre ?? null,
        creadoEn: c.creadoEn,
      })),
    };
  }

  async crearSalida(dto: CrearSalidaDto, usuarioId?: number) {
    const disponible = await this.efectivoSistema(formatoFecha(new Date()));
    if (dto.monto > disponible) {
      throw new BadRequestException(
        `No hay suficiente efectivo en caja. Saldo actual: $${Math.round(disponible).toLocaleString('es-CL')}`,
      );
    }
    return this.prisma.salidaCaja.create({
      data: {
        fecha: soloFecha(dto.fecha),
        concepto: dto.concepto.trim(),
        responsable: dto.responsable.trim(),
        monto: dto.monto,
        usuarioId: usuarioId ?? null,
      },
    });
  }

  async cuadrarEfectivo(dto: CuadreEfectivoDto, usuarioId?: number) {
    const detalle = {
      monedas10: dto.monedas10,
      monedas50: dto.monedas50,
      monedas100: dto.monedas100,
      monedas500: dto.monedas500,
      billetes1000: dto.billetes1000,
      billetes2000: dto.billetes2000,
      billetes5000: dto.billetes5000,
      billetes10000: dto.billetes10000,
      billetes20000: dto.billetes20000,
    };
    const contado =
      dto.monedas10 * 10 +
      dto.monedas50 * 50 +
      dto.monedas100 * 100 +
      dto.monedas500 * 500 +
      dto.billetes1000 * 1000 +
      dto.billetes2000 * 2000 +
      dto.billetes5000 * 5000 +
      dto.billetes10000 * 10000 +
      dto.billetes20000 * 20000;
    const sistema = await this.efectivoSistema(dto.fecha);

    return this.prisma.cuadreCaja.create({
      data: {
        fecha: soloFecha(dto.fecha),
        tipo: TipoCuadre.EFECTIVO,
        contado,
        sistema,
        diferencia: contado - sistema,
        observaciones: dto.observaciones?.trim() || null,
        detalle,
        usuarioId: usuarioId ?? null,
      },
    });
  }

  async cuadrarBanco(dto: CuadreBancoDto, usuarioId?: number) {
    const sistema = await this.entradas([MedioPago.DEBITO, MedioPago.TRANSFERENCIA], dto.fecha);
    return this.prisma.cuadreCaja.create({
      data: {
        fecha: soloFecha(dto.fecha),
        tipo: TipoCuadre.BANCO,
        contado: dto.saldoBanco,
        sistema,
        diferencia: dto.saldoBanco - sistema,
        observaciones: dto.observaciones?.trim() || null,
        usuarioId: usuarioId ?? null,
      },
    });
  }
}
