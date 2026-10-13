import { IsInt, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class RegistrarProduccionDto {
  @IsInt()
  bodegaId: number;

  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  cantidadBloques: number;

  @IsNumber()
  @Min(0.1)
  alturaBloqueCm: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}