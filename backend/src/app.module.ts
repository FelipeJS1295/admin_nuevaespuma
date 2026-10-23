import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BodegasModule } from './bodegas/bodegas.module';
import { ProductosModule } from './productos/productos.module';
import { StockModule } from './stock/stock.module';
import { ClientesModule } from './clientes/clientes.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { VentasModule } from './ventas/ventas.module';
import { InformesModule } from './informes/informes.module';
import { DespachosModule } from './despachos/despachos.module';
import { CajaModule } from './caja/caja.module';

@Module({
  imports: [PrismaModule, BodegasModule, ProductosModule, StockModule, ClientesModule, AuthModule, UsuariosModule, VentasModule, InformesModule, DespachosModule, CajaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}