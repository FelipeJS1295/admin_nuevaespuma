import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoDocumento } from '@prisma/client';

export class RegistrarDocumentoDto {
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  numeroDocumento: string;
}