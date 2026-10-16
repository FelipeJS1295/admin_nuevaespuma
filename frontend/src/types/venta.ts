export type MedioPago = 'EFECTIVO' | 'DEBITO' | 'TRANSFERENCIA' | 'CREDITO_CLIENTE';

export interface VentaItem {
  id: number;
  productoId: number;
  espesorCm: number;
  precioUnitario: number;
  subtotal: number;
  producto: {
    id: number;
    nombre: string;
    sku: string;
    densidad: number;
  };
}

export interface Pago {
  id: number;
  medioPago: MedioPago;
  monto: number;
  conIva: boolean;
  iva: number;
  total: number;
}

export interface Venta {
  id: number;
  bodegaId: number;
  clienteId: number | null;
  subtotal: number;
  iva: number;
  total: number;
  saldoPendiente: number;
  tipoDocumento: 'FACTURA' | 'NOTA_VENTA' | null;
  numeroDocumento: string | null;
  creadoEn: string;
  bodega: { id: number; nombre: string };
  cliente: { id: number; nombre: string; rut: string } | null;
  items: VentaItem[];
  pagos: Pago[];
}