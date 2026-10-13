import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}