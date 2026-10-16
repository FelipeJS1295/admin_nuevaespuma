import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { RegistrarPagoPendienteDto } from './dto/registrar-pago-pendiente.dto';
import { RegistrarDocumentoDto } from './dto/registrar-documento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN, Rol.VENTAS)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto, @Req() req: any) {
    return this.ventasService.create(createVentaDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('cliente') cliente?: string,
    @Query('estado') estado?: string,
    @Query('documento') documento?: string,
  ) {
    return this.ventasService.findAll({ desde, hasta, cliente, estado, documento });
  }

  @Get('del-dia')
  findDelDia() {
    return this.ventasService.findDelDia();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Post(':id/pagos')
  registrarPago(@Param('id', ParseIntPipe) id: number, @Body() dto: RegistrarPagoPendienteDto) {
    return this.ventasService.registrarPagoPendiente(id, dto.monto, dto.medioPago, dto.conIva ?? false);
  }

   @Patch(':id/documento')
  registrarDocumento(@Param('id', ParseIntPipe) id: number, @Body() dto: RegistrarDocumentoDto) {
    return this.ventasService.registrarDocumento(id, dto.tipoDocumento, dto.numeroDocumento);
  }

  // Solo administradores pueden eliminar ventas (este @Roles reemplaza al de la clase)
  @Delete(':id')
  @Roles(Rol.ADMIN_MASTER, Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.eliminar(id);
  }
}