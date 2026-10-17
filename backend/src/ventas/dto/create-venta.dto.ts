import {
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDocumento } from '@prisma/client';
import { VentaItemDto } from './venta-item.dto';
import { PagoDto } from './pago.dto';

export class CreateVentaDto {
  @IsInt()
  bodegaId: number;

  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipoDocumento?: TipoDocumento;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numeroDocumento?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha de vencimiento debe tener el formato AAAA-MM-DD' })
  fechaVencimiento?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VentaItemDto)
  items: VentaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoDto)
  pagos: PagoDto[];
}