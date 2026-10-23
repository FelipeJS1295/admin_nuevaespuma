import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { CajaService } from './caja.service';
import { CrearSalidaDto, CuadreBancoDto, CuadreEfectivoDto } from './dto/caja.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('caja')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN)
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('resumen')
  resumen(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.cajaService.resumen(desde, hasta);
  }

  @Post('salidas')
  crearSalida(@Body() dto: CrearSalidaDto, @Req() req: any) {
    return this.cajaService.crearSalida(dto, req.user.id);
  }

  @Post('cuadres/efectivo')
  cuadrarEfectivo(@Body() dto: CuadreEfectivoDto, @Req() req: any) {
    return this.cajaService.cuadrarEfectivo(dto, req.user.id);
  }

  @Post('cuadres/banco')
  cuadrarBanco(@Body() dto: CuadreBancoDto, @Req() req: any) {
    return this.cajaService.cuadrarBanco(dto, req.user.id);
  }
}
