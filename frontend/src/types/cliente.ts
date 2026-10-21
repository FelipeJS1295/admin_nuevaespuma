export interface Cliente {
  id: number;
  rut: string;
  nombre: string;
  limiteCredito: number;
  creditoUsado: number;
  activo: boolean;
  conFactura: boolean;
  diasCredito: number;
  creadoEn: string;
}

export interface Abono {
  id: number;
  monto: number;
  medioPago: string;
  observacion: string | null;
  creadoEn: string;
}

export interface VentaDeCliente {
  id: number;
  subtotal: number;
  iva: number;
  total: number;
  creadoEn: string;
  bodega: { id: number; nombre: string };
  items: {
    id: number;
    espesorCm: number;
    cantidad: number;
    subtotal: number;
    producto: { id: number; nombre: string; sku: string };
  }[];
  pagos: {
    id: number;
    medioPago: string;
    monto: number;
    conIva: boolean;
    iva: number;
    total: number;
  }[];
}

export interface ClienteDetalle extends Cliente {
  ventas: VentaDeCliente[];
  abonos: Abono[];
}