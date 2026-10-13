export type TipoMovimiento = 'PRODUCCION' | 'VENTA' | 'TRANSFERENCIA_SALIDA' | 'TRANSFERENCIA_ENTRADA' | 'AJUSTE';

export interface MovimientoStock {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  observacion: string | null;
  creadoEn: string;
  bodega: {
    id: number;
    nombre: string;
  };
  producto: {
    id: number;
    nombre: string;
    sku: string;
  };
}