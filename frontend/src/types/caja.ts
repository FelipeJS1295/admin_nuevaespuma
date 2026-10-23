export interface SalidaCaja {
  id: number;
  fecha: string;
  concepto: string;
  responsable: string;
  monto: number;
  registradaPor: string | null;
}

export interface CuadreCaja {
  id: number;
  fecha: string;
  tipo: 'EFECTIVO' | 'BANCO';
  contado: number;
  sistema: number;
  diferencia: number;
  observaciones: string | null;
  detalle: Record<string, number> | null;
  registradoPor: string | null;
  creadoEn: string;
}

export interface ResumenCaja {
  desde: string;
  hasta: string;
  periodo: {
    efectivo: number;
    debito: number;
    transferencia: number;
    totalIngresado: number;
    salidas: number;
  };
  saldoEfectivo: number;
  saldoBanco: number;
  salidas: SalidaCaja[];
  cuadres: CuadreCaja[];
}
