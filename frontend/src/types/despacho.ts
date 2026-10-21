export interface DespachoItemVenta {
  id: number;
  espesorCm: number;
  cantidad: number;
  cantidadDespachada: number;
  pendiente: number;
  producto: { nombre: string; densidad: number };
}

export interface HistorialDespacho {
  id: number;
  creadoEn: string;
  observacion: string | null;
  usuario: { nombre: string } | null;
  items: { ventaItemId: number; cantidad: number }[];
}

export interface VentaDespacho {
  id: number;
  creadoEn: string;
  bodega: { nombre: string };
  cliente: { nombre: string } | null;
  estadoEntrega: 'PENDIENTE' | 'PARCIAL' | 'COMPLETO';
  items: DespachoItemVenta[];
  despachos: HistorialDespacho[];
}
