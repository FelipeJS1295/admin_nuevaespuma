import { Module } from '@nestjs/common';
import { DespachosService } from './despachos.service';
import { DespachosController } from './despachos.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DespachosController],
  providers: [DespachosService],
})
export class DespachosModule {}
