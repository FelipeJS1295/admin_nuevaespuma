import type { Venta } from '../types/venta';

// Ancho en caracteres de una impresora de boletas de 58 mm
const ANCHO = 32;

const numero = (n: number) => Math.round(n).toLocaleString('es-CL');
const pesos = (n: number) => `$${numero(n)}`;
const cm = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });

const centrar = (texto: string) => ' '.repeat(Math.max(0, Math.floor((ANCHO - texto.length) / 2))) + texto;
const linea = (izq: string, der: string) => izq + ' '.repeat(Math.max(1, ANCHO - izq.length - der.length)) + der;
const separador = (c = '-') => c.repeat(ANCHO);

// Parte un texto largo en varias líneas del ancho del ticket
const envolver = (texto: string): string[] => {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(' ')) {
    if (actual && (actual + ' ' + palabra).length > ANCHO) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
};

const etiquetaPago: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_CLIENTE: 'Crédito',
};

const cabecera = (venta: Venta, titulo: string): string[] => {
  const lineas = [
    centrar('NUEVA ESPUMA'),
    centrar(titulo),
    separador('='),
    `Venta #${venta.id}`,
    `Fecha: ${new Date(venta.creadoEn).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`,
    `Bodega: ${venta.bodega.nombre}`,
    ...envolver(`Cliente: ${venta.cliente ? venta.cliente.nombre : 'Sin cliente'}`),
  ];
  if (venta.numeroDocumento) {
    lineas.push(`${venta.tipoDocumento === 'FACTURA' ? 'Factura' : 'Nota de venta'}: ${venta.numeroDocumento}`);
  }
  lineas.push(separador('-'));
  return lineas;
};

// Ticket para el cliente: con montos
export function ticketCliente(venta: Venta, extra?: { recibido: number; vuelto: number }): string {
  const t = cabecera(venta, 'COMPROBANTE DE VENTA');

  for (const item of venta.items) {
    t.push(...envolver(item.producto.nombre));
    t.push(`${cm(item.espesorCm)} cm x ${item.cantidad} un.`);
    t.push(linea(`$${numero(item.precioUnitario)}/cm`, pesos(item.subtotal)));
    t.push(separador('-'));
  }

  t.push(linea('SUBTOTAL:', pesos(venta.subtotal)));
  t.push(linea('IVA:', pesos(venta.iva)));
  t.push(linea('TOTAL:', pesos(venta.total)));
  t.push(separador('='));

  t.push('FORMA DE PAGO:');
  for (const p of venta.pagos) {
    t.push(linea(etiquetaPago[p.medioPago] ?? p.medioPago, pesos(p.total)));
    if (p.conIva) t.push(linea('  (incluye IVA)', pesos(p.iva)));
  }
  if (extra && extra.recibido > 0) {
    t.push(linea('Recibido:', pesos(extra.recibido)));
    t.push(linea('Vuelto:', pesos(extra.vuelto)));
  }
  if (venta.saldoPendiente > 0.5) {
    t.push(linea('SALDO PENDIENTE:', pesos(venta.saldoPendiente)));
  }

  t.push(separador('='));
  t.push(centrar('Gracias por su compra'));
  t.push(centrar('Retire en despacho'));
  return t.join('\n');
}

// Ticket para despacho: sin ningún monto, solo densidad, centímetros y unidades
export function ticketDespacho(venta: Venta): string {
  const t = cabecera(venta, 'COPIA DESPACHO');

  for (const item of venta.items) {
    t.push(`Densidad: ${item.producto.densidad}`);
    t.push(`${cm(item.espesorCm)} cm x ${item.cantidad} un.`);
    t.push(separador('-'));
  }

  t.push('');
  t.push('Entregado por: ____________');
  t.push('');
  t.push('Recibido por:  ____________');
  return t.join('\n');
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Alto de cada línea del ticket y márgenes, en milímetros (para que el papel se corte justo al terminar el texto)
const ALTO_LINEA_MM = 4;
const MARGEN_SUPERIOR_MM = 1;
const MARGEN_INFERIOR_MM = 5;

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// Imprime un ticket en su propia hoja de 58 mm, con el alto exacto de su contenido (sin abrir ventanas nuevas)
async function imprimirUno(texto: string) {
  const lineas = texto.split('\n').length;
  const altoMm = Math.ceil(lineas * ALTO_LINEA_MM + MARGEN_SUPERIOR_MM + MARGEN_INFERIOR_MM);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title> </title><style>
    @page { margin: 0; size: 58mm ${altoMm}mm; }
    html, body { margin: 0; padding: 0; }
    body { width: 58mm; height: ${altoMm}mm; overflow: hidden; padding: ${MARGEN_SUPERIOR_MM}mm 1mm 0 1mm; box-sizing: border-box;
           font-family: monospace; font-size: 9pt; line-height: ${ALTO_LINEA_MM}mm; }
    pre { margin: 0; font: inherit; line-height: inherit; white-space: pre-wrap; }
  </style></head><body><pre>${escapar(texto)}</pre></body></html>`);
  doc.close();

  await esperar(300);
  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  await esperar(1500);
  iframe.remove();
}

// Manda a imprimir los tickets, uno tras otro, cada uno como un trabajo de impresión separado
export async function imprimirTickets(tickets: string[]) {
  for (const t of tickets) {
    await imprimirUno(t);
  }
}
