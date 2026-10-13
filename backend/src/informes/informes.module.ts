import { Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}