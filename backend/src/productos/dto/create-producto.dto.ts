import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  sku: string;

  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  densidad: number;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}