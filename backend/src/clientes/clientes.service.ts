import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  create(createClienteDto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: createClienteDto,
    });
  }

  async importar(clientes: CreateClienteDto[]) {
    const resultado = await this.prisma.cliente.createMany({
      data: clientes.map((c) => ({
        rut: c.rut,
        nombre: c.nombre,
        limiteCredito: c.limiteCredito ?? 0,
      })),
    });
    return { importados: resultado.count };
  }

  findAll() {
    return this.prisma.cliente.findMany();
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return cliente;
  }

  async findDetalle(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: {
          include: {
            bodega: true,
            items: { include: { producto: true } },
            pagos: true,
          },
          orderBy: { creadoEn: 'desc' },
        },
        abonos: {
          orderBy: { creadoEn: 'desc' },
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return cliente;
  }

  async registrarAbono(id: number, monto: number, medioPago: any, observacion?: string) {
    const cliente = await this.findOne(id);

    if (monto > cliente.creditoUsado) {
      throw new NotFoundException(
        `El abono ($${monto}) es mayor a la deuda actual del cliente ($${cliente.creditoUsado})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const abono = await tx.abono.create({
        data: { clienteId: id, monto, medioPago, observacion },
      });
      await tx.cliente.update({
        where: { id },
        data: { creditoUsado: { decrement: monto } },
      });
      return abono;
    });
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Verifica si el cliente tiene crédito suficiente para una compra de "monto"
  async tieneCreditoDisponible(id: number, monto: number): Promise<boolean> {
    const cliente = await this.findOne(id);
    const disponible = cliente.limiteCredito - cliente.creditoUsado;
    return disponible >= monto;
  }
}