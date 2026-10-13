import { IsInt, IsNumber, Min } from 'class-validator';

export class VentaItemDto {
  @IsInt()
  productoId: number;

  @IsNumber()
  @Min(0.1)
  espesorCm: number;
}