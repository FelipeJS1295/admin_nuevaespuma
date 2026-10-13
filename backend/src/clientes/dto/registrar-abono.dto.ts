import { IsNumber, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { MedioPago } from '@prisma/client';

export class RegistrarAbonoDto {
  @IsNumber()
  @Min(1)
  monto: number;

  @IsEnum(MedioPago)
  medioPago: MedioPago;

  @IsOptional()
  @IsString()
  observacion?: string;
}