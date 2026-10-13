import { IsEnum, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { MedioPago } from '@prisma/client';

export class PagoDto {
  @IsEnum(MedioPago)
  medioPago: MedioPago;

  @IsNumber()
  @Min(1)
  monto: number;

  @IsOptional()
  @IsBoolean()
  conIva?: boolean;
}