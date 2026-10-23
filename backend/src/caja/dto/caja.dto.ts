import { IsInt, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CrearSalidaDto {
  @Matches(FECHA, { message: 'La fecha debe tener formato AAAA-MM-DD' })
  fecha: string;

  @IsString()
  @MinLength(1)
  concepto: string;

  @IsString()
  @MinLength(1)
  responsable: string;

  @IsNumber()
  @Min(1)
  monto: number;
}

export class CuadreEfectivoDto {
  @Matches(FECHA, { message: 'La fecha debe tener formato AAAA-MM-DD' })
  fecha: string;

  @IsInt() @Min(0) monedas10: number;
  @IsInt() @Min(0) monedas50: number;
  @IsInt() @Min(0) monedas100: number;
  @IsInt() @Min(0) monedas500: number;
  @IsInt() @Min(0) billetes1000: number;
  @IsInt() @Min(0) billetes2000: number;
  @IsInt() @Min(0) billetes5000: number;
  @IsInt() @Min(0) billetes10000: number;
  @IsInt() @Min(0) billetes20000: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CuadreBancoDto {
  @Matches(FECHA, { message: 'La fecha debe tener formato AAAA-MM-DD' })
  fecha: string;

  @IsNumber()
  @Min(0)
  saldoBanco: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
