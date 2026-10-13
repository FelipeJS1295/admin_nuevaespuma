export type Rol = 'ADMIN_MASTER' | 'ADMIN' | 'VENTAS' | 'PRODUCCION' | 'DESPACHO';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}