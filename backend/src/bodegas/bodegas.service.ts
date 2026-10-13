import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBodegaDto } from './dto/create-bodegas.dto';
import { UpdateBodegaDto } from './dto/update-bodegas.dto';

@Injectable()
export class BodegasService {
  constructor(private prisma: PrismaService) {}

  create(createBodegaDto: CreateBodegaDto) {
    return this.prisma.bodega.create({
      data: createBodegaDto,
    });
  }

  findAll() {
    return this.prisma.bodega.findMany();
  }

  async findOne(id: number) {
    const bodega = await this.prisma.bodega.findUnique({ where: { id } });
    if (!bodega) {
      throw new NotFoundException(`Bodega con id ${id} no encontrada`);
    }
    return bodega;
  }

  async update(id: number, updateBodegaDto: UpdateBodegaDto) {
    await this.findOne(id); // valida que exista antes de actualizar
    return this.prisma.bodega.update({
      where: { id },
      data: updateBodegaDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // valida que exista
    // No borramos de verdad, solo la desactivamos (para no perder historial)
    return this.prisma.bodega.update({
      where: { id },
      data: { activa: false },
    });
  }
}