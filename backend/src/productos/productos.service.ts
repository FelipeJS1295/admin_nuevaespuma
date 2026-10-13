import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto) {
    try {
      return await this.prisma.producto.create({
        data: createProductoDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Ya existe un producto con el SKU "${createProductoDto.sku}"`);
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.producto.findMany();
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return producto;
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: updateProductoDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // No se borra, solo se desactiva (para no perder historial de ventas/producción)
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }
}