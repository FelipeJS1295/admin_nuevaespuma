import { IsNumber, Min, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { MedioPago } from '@prisma/client';

export class RegistrarPagoPendienteDto {
  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsEnum(MedioPago)
  medioPago: MedioPago;

  @IsOptional()
  @IsBoolean()
  conIva?: boolean;
}