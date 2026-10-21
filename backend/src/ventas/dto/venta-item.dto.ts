import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class VentaItemDto {
  @IsInt()
  productoId: number;

  @IsNumber()
  @Min(0.1)
  espesorCm: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;
}