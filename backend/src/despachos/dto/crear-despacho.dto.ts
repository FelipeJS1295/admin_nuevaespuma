import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DespachoItemDto {
  @IsInt()
  ventaItemId: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CrearDespachoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DespachoItemDto)
  items: DespachoItemDto[];

  @IsOptional()
  @IsString()
  observacion?: string;
}
