import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  rut: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteCredito?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}