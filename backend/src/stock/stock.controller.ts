import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { RegistrarProduccionDto } from './dto/registrar-produccion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN, Rol.PRODUCCION)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll() {
    return this.stockService.findAll();
  }

  @Get('movimientos')
  findMovimientos() {
    return this.stockService.findMovimientos();
  }

  @Post('produccion')
  registrarProduccion(@Body() dto: RegistrarProduccionDto) {
    return this.stockService.registrarProduccion(dto);
  }
}