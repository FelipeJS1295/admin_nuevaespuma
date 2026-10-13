import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Rol } from '@prisma/client';

export class CreateUsuarioDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;

  @IsEnum(Rol)
  rol: Rol;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}