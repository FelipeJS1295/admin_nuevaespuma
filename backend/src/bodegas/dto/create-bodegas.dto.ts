import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBodegaDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}