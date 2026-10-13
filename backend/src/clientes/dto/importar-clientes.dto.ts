import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClienteDto } from './create-cliente.dto';

export class ImportarClientesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateClienteDto)
  clientes: CreateClienteDto[];
}