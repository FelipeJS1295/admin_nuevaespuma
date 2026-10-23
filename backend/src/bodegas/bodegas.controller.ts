import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BodegasService } from './bodegas.service';
import { CreateBodegaDto } from './dto/create-bodegas.dto';
import { UpdateBodegaDto } from './dto/update-bodegas.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('bodegas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN)
export class BodegasController {
  constructor(private readonly bodegasService: BodegasService) {}

  @Post()
  create(@Body() createBodegaDto: CreateBodegaDto) {
    return this.bodegasService.create(createBodegaDto);
  }

  // El listado también lo necesita VENTAS para crear ventas (este @Roles reemplaza al de la clase)
  @Get()
  @Roles(Rol.ADMIN_MASTER, Rol.ADMIN, Rol.VENTAS)
  findAll() {
    return this.bodegasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bodegasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBodegaDto: UpdateBodegaDto,
  ) {
    return this.bodegasService.update(id, updateBodegaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bodegasService.remove(id);
  }
}