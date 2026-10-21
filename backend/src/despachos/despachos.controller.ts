import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { DespachosService } from './despachos.service';
import { CrearDespachoDto } from './dto/crear-despacho.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('despachos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN, Rol.DESPACHO)
export class DespachosController {
  constructor(private readonly despachosService: DespachosService) {}

  @Get()
  listar(
    @Query('estado') estado?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('cliente') cliente?: string,
  ) {
    return this.despachosService.listar({ estado, desde, hasta, cliente });
  }

  @Post('venta/:ventaId')
  despachar(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body() dto: CrearDespachoDto,
    @Req() req: any,
  ) {
    return this.despachosService.despachar(ventaId, dto, req.user.id);
  }
}
