import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { InformeIngresos } from '../../types/informes';
import FiltroFechas from '../FiltroFechas';
import { Banknote, CreditCard, Landmark } from 'lucide-react';

interface Props {
  desde: string;
  hasta: string;
  onCambioFechas: (desde: string, hasta: string) => void;
}

const etiquetas: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferencia',
};

const iconos = {
  EFECTIVO: Banknote,
  DEBITO: CreditCard,
  TRANSFERENCIA: Landmark,
};

const pesos = (n: number) => `$${n.toLocaleString('es-CL')}`;

const formatoDia = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}-${mes}-${anio}`;
};

export default function InformeIngresosTab({ desde, hasta, onCambioFechas }: Props) {
  const [datos, setDatos] = useState<InformeIngresos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get<InformeIngresos>('/informes/ingresos', { params: { desde, hasta } });
        if (vigente) setDatos(res.data);
      } catch {
        if (vigente) setError('No se pudo cargar el informe de ingresos.');
      } finally {
        if (vigente) setCargando(false);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [desde, hasta]);

  const totalesDia = datos
    ? datos.porDia.reduce(
        (acc, d) => ({
          EFECTIVO: acc.EFECTIVO + d.EFECTIVO,
          DEBITO: acc.DEBITO + d.DEBITO,
          TRANSFERENCIA: acc.TRANSFERENCIA + d.TRANSFERENCIA,
          total: acc.total + d.total,
        }),
        { EFECTIVO: 0, DEBITO: 0, TRANSFERENCIA: 0, total: 0 },
      )
    : null;

  return (
    <div>
      <FiltroFechas desde={desde} hasta={hasta} onCambio={onCambioFechas} />

      {error && <p className="text-danger mb-4">{error}</p>}
      {cargando && !datos && <p className="text-ink/50">Cargando...</p>}

      {datos && totalesDia && (
        <div className={cargando ? 'opacity-60 transition' : 'transition'}>
          {/* Total ingresado */}
          <div className="bg-white border border-ink/10 rounded p-5 mb-6">
            <p className="text-sm text-ink/50 mb-1">Total ingresado en el período</p>
            <p className="text-3xl font-mono font-semibold">{pesos(datos.resumen.totalIngresado)}</p>
            <p className="text-xs text-ink/40 mt-2 font-mono">
              Por ventas {pesos(datos.resumen.porVentas)} + abonos de clientes {pesos(datos.resumen.porAbonos)}
            </p>
            <p className="text-xs text-ink/40 mt-1">
              Incluye {pesos(datos.resumen.iva)} de IVA cobrado. Es plata que efectivamente entró.
            </p>
          </div>

          {/* Una tarjeta por medio de pago */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {datos.porMedio.map((m) => {
              const Icono = iconos[m.medio];
              const porcentaje =
                datos.resumen.totalIngresado > 0 ? Math.round((m.total / datos.resumen.totalIngresado) * 100) : 0;
              return (
                <div key={m.medio} className="bg-white border border-ink/10 rounded p-4">
                  <div className="flex items-center gap-2 text-sm text-ink/60 mb-2">
                    <Icono size={16} />
                    {etiquetas[m.medio]}
                  </div>
                  <p className="text-2xl font-mono font-semibold">{pesos(m.total)}</p>
                  <div className="h-1.5 bg-ink/5 rounded overflow-hidden mt-3 mb-1.5">
                    <div className="h-full bg-amber" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <p className="text-xs text-ink/40">
                    {porcentaje}% del total · {m.cantidad} {m.cantidad === 1 ? 'movimiento' : 'movimientos'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detalle por medio */}
          <div className="bg-white border border-ink/10 rounded overflow-hidden mb-6">
            <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Detalle por medio de pago</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                  <th className="py-2 px-4 font-medium">Medio</th>
                  <th className="py-2 px-4 font-medium text-right">Neto ventas</th>
                  <th className="py-2 px-4 font-medium text-right">IVA</th>
                  <th className="py-2 px-4 font-medium text-right">Abonos</th>
                  <th className="py-2 px-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {datos.porMedio.map((m) => (
                  <tr key={m.medio} className="border-b border-ink/5 last:border-0 text-sm">
                    <td className="py-2 px-4">{etiquetas[m.medio]}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(m.neto)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(m.iva)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(m.abonosTotal)}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium">{pesos(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Crédito del cliente */}
          <div className="bg-white border border-amber/40 rounded p-4 mb-6">
            <h3 className="text-sm font-medium text-ink mb-1">Crédito del cliente (por cobrar)</h3>
            <p className="text-xs text-ink/50 mb-3">
              Esta plata no entró: se le fió a los clientes. No se suma al total ingresado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink/50">Vendido con "Crédito del cliente"</p>
                <p className="text-xl font-mono font-semibold text-amber-dark">{pesos(datos.credito.ventasACredito)}</p>
              </div>
              <div>
                <p className="text-xs text-ink/50">Saldo pendiente de las ventas del período (neto)</p>
                <p className="text-xl font-mono font-semibold text-amber-dark">
                  {pesos(datos.credito.saldoPendienteVentas)}
                </p>
              </div>
            </div>
          </div>

          {/* Por día */}
          <div className="bg-white border border-ink/10 rounded overflow-hidden">
            <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Ingresos por día</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                  <th className="py-2 px-4 font-medium">Fecha</th>
                  <th className="py-2 px-4 font-medium text-right">Efectivo</th>
                  <th className="py-2 px-4 font-medium text-right">Débito</th>
                  <th className="py-2 px-4 font-medium text-right">Transferencia</th>
                  <th className="py-2 px-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {datos.porDia.map((d) => (
                  <tr key={d.fecha} className="border-b border-ink/5 text-sm">
                    <td className="py-2 px-4 font-mono">{formatoDia(d.fecha)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(d.EFECTIVO)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(d.DEBITO)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(d.TRANSFERENCIA)}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium">{pesos(d.total)}</td>
                  </tr>
                ))}
                {datos.porDia.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-ink/40">
                      No hay ingresos en este período.
                    </td>
                  </tr>
                )}
              </tbody>
              {datos.porDia.length > 0 && (
                <tfoot>
                  <tr className="border-t border-ink/10 bg-ink/[0.02] text-sm font-medium">
                    <td className="py-2 px-4">Total</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(totalesDia.EFECTIVO)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(totalesDia.DEBITO)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(totalesDia.TRANSFERENCIA)}</td>
                    <td className="py-2 px-4 text-right font-mono">{pesos(totalesDia.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}