export interface InformeVentas {
  desde: string;
  hasta: string;
  resumen: {
    cantidad: number;
    subtotal: number;
    iva: number;
    totalCobrado: number;
    saldoPendiente: number;
  };
  porDia: { fecha: string; cantidad: number; total: number }[];
  porProducto: {
    productoId: number;
    nombre: string;
    sku: string;
    densidad: number;
    cmVendidos: number;
    montoNeto: number;
  }[];
  porVendedor: { vendedor: string; cantidad: number; total: number }[];
}

export interface InformeCuentasPorCobrar {
  resumen: {
    clientesConDeuda: number;
    deudaTotal: number;
    clientesSobreLimite: number;
  };
  clientes: {
    clienteId: number;
    nombre: string;
    rut: string;
    activo: boolean;
    limiteCredito: number;
    deuda: number;
    disponible: number;
    superaLimite: boolean;
    ventasPendientes: number;
    saldoEnVentas: number;
    diasVentaMasAntigua: number | null;
  }[];
}

export interface InformeInventario {
  desde: string;
  hasta: string;
  stockTotalCm: number;
  porBodega: {
    bodegaId: number;
    bodega: string;
    totalCm: number;
    productos: {
      productoId: number;
      nombre: string;
      sku: string;
      densidad: number;
      cantidad: number;
    }[];
  }[];
  stockNegativo: { bodega: string; producto: string; cantidad: number }[];
  movimientosPorTipo: { tipo: string; cantidadMovimientos: number; totalCm: number }[];
  densidadesMasVendidas: { densidad: number; cmVendidos: number; montoNeto: number }[];
}

export interface InformeProduccion {
  desde: string;
  hasta: string;
  resumen: { registros: number; totalCm: number };
  porDia: { fecha: string; registros: number; totalCm: number }[];
  porProducto: {
    productoId: number;
    nombre: string;
    sku: string;
    densidad: number;
    registros: number;
    totalCm: number;
  }[];
  porDensidad: { densidad: number; registros: number; totalCm: number }[];
  porBodega: { bodegaId: number; bodega: string; registros: number; totalCm: number }[];
}


export interface InformeIngresos {
  desde: string;
  hasta: string;
  resumen: {
    totalIngresado: number;
    porVentas: number;
    porAbonos: number;
    iva: number;
  };
  porMedio: {
    medio: 'EFECTIVO' | 'DEBITO' | 'TRANSFERENCIA';
    cantidad: number;
    neto: number;
    iva: number;
    ventasTotal: number;
    abonosTotal: number;
    total: number;
  }[];
  credito: {
    ventasACredito: number;
    saldoPendienteVentas: number;
  };
  porDia: {
    fecha: string;
    EFECTIVO: number;
    DEBITO: number;
    TRANSFERENCIA: number;
    total: number;
  }[];
}