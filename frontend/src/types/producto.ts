export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  densidad: number;
  espesor: number;
  precio: number;
  activo: boolean;
  creadoEn: string;
}