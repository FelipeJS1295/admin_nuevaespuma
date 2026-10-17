export interface VentaParaDeuda {
  id: number;
  creadoEn: Date;
  fechaVencimiento: Date | null;
  saldoPendiente: number;
  pagos: { medioPago: string; total: number }[];
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Fecha de hoy en Chile (AAAA-MM-DD), sin depender de la zona horaria del servidor
export const hoyEnChile = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

const aTexto = (d: Date) => d.toISOString().slice(0, 10);

const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MS_POR_DIA);

export function calcularDeudaVencida(creditoUsado: number, ventas: VentaParaDeuda[]) {
  const hoy = hoyEnChile();

  // Deuda que cada venta le sumó al cliente: pagos con "Crédito del cliente" + saldo pendiente
  const conDeuda = ventas
    .map((v) => ({
      id: v.id,
      creadoEn: v.creadoEn,
      vence: v.fechaVencimiento ? aTexto(v.fechaVencimiento) : null,
      deuda:
        v.pagos.filter((p) => p.medioPago === 'CREDITO_CLIENTE').reduce((acc, p) => acc + p.total, 0) +
        v.saldoPendiente,
    }))
    .filter((v) => v.deuda > 0)
    .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime());

  // Lo que ya se abonó se descuenta de las ventas más antiguas primero
  let abonado = Math.max(0, conDeuda.reduce((acc, v) => acc + v.deuda, 0) - creditoUsado);

  const pendientes: { id: number; vence: string | null; restante: number }[] = [];
  for (const v of conDeuda) {
    const descuento = Math.min(v.deuda, abonado);
    abonado -= descuento;
    const restante = v.deuda - descuento;
    if (restante > 0.5) pendientes.push({ id: v.id, vence: v.vence, restante });
  }

  // Vencida = su fecha de vencimiento ya pasó (se cuenta desde el día siguiente)
  const vencidas = pendientes.filter((v) => v.vence !== null && v.vence < hoy);
  const porVencer = pendientes.filter((v) => v.vence !== null && v.vence >= hoy);

  const masAntigua = vencidas.map((v) => v.vence as string).sort()[0] ?? null;
  const proxima = porVencer.map((v) => v.vence as string).sort()[0] ?? null;

  return {
    vencida: vencidas.length > 0,
    montoVencido: vencidas.reduce((acc, v) => acc + v.restante, 0),
    ventasVencidas: vencidas.length,
    fechaVencimientoMasAntigua: masAntigua,
    diasVencida: masAntigua ? diasEntre(masAntigua, hoy) : 0,
    proximoVencimiento: proxima,
  };
}