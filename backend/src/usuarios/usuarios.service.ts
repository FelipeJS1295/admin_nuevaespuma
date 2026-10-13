import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Prisma, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Nunca devolvemos el password al frontend, ni siquiera encriptado
const seleccionSegura = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  activo: true,
  creadoEn: true,
};

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  // Solo un ADMIN_MASTER puede ver y tocar usuarios ADMIN_MASTER
  private filtroVisible(rolSolicitante: Rol): Prisma.UsuarioWhereInput {
    return rolSolicitante === Rol.ADMIN_MASTER ? {} : { rol: { not: Rol.ADMIN_MASTER } };
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    try {
      const passwordEncriptada = await bcrypt.hash(createUsuarioDto.password, 10);
      return await this.prisma.usuario.create({
        data: {
          ...createUsuarioDto,
          password: passwordEncriptada,
        },
        select: seleccionSegura,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Ya existe un usuario con el correo "${createUsuarioDto.email}"`);
      }
      throw error;
    }
  }

  findAll(rolSolicitante: Rol) {
    return this.prisma.usuario.findMany({
      where: this.filtroVisible(rolSolicitante),
      select: seleccionSegura,
    });
  }

  async findOne(id: number, rolSolicitante: Rol) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, ...this.filtroVisible(rolSolicitante) },
      select: seleccionSegura,
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto, rolSolicitante: Rol) {
    await this.findOne(id, rolSolicitante);

    const data: any = { ...updateUsuarioDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: seleccionSegura,
    });
  }

  async remove(id: number, rolSolicitante: Rol) {
    await this.findOne(id, rolSolicitante);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: seleccionSegura,
    });
  }
}