import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InformesService } from './informes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('informes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN)
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get('ventas')
  ventas(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.informesService.ventas(desde, hasta);
  }

  @Get('cuentas-por-cobrar')
  cuentasPorCobrar() {
    return this.informesService.cuentasPorCobrar();
  }

  @Get('inventario')
  inventario(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.informesService.inventario(desde, hasta);
  }

  @Get('produccion')
  produccion(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.informesService.produccion(desde, hasta);
  }

  @Get('ingresos')
  ingresos(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.informesService.ingresos(desde, hasta);
  }
}