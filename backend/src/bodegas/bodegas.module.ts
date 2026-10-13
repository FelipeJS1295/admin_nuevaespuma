import { Module } from '@nestjs/common';
import { BodegasService } from './bodegas.service';
import { BodegasController } from './bodegas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BodegasController],
  providers: [BodegasService],
})
export class BodegasModule {}