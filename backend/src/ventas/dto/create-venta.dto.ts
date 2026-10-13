import { IsInt, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { VentaItemDto } from './venta-item.dto';
import { PagoDto } from './pago.dto';

export class CreateVentaDto {
  @IsInt()
  bodegaId: number;

  @IsOptional()
  @IsInt()
  clienteId?: number;

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