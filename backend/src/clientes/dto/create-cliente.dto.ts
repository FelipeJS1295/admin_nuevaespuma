import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

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
  @IsInt()
  @Min(0)
  @Max(365)
  diasCredito?: number;

  @IsOptional()
  @IsBoolean()
  conFactura?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}