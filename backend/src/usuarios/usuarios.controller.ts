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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN_MASTER, Rol.ADMIN)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto, @Req() req: any) {
    // Un ADMIN (no master) no puede crear otro ADMIN_MASTER
    if (req.user.rol !== Rol.ADMIN_MASTER && createUsuarioDto.rol === Rol.ADMIN_MASTER) {
      throw new ForbiddenException('No tienes permisos para crear un usuario ADMIN_MASTER');
    }
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.usuariosService.findAll(req.user.rol);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usuariosService.findOne(id, req.user.rol);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: any,
  ) {
    if (req.user.rol !== Rol.ADMIN_MASTER && updateUsuarioDto.rol === Rol.ADMIN_MASTER) {
      throw new ForbiddenException('No tienes permisos para asignar el rol ADMIN_MASTER');
    }
    return this.usuariosService.update(id, updateUsuarioDto, req.user.rol);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usuariosService.remove(id, req.user.rol);
  }
}