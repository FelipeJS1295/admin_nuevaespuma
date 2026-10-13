import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { InformeVentas } from '../../types/informes';
import FiltroFechas from '../FiltroFechas';

interface Props {
  desde: string;
  hasta: string;
  onCambioFechas: (desde: string, hasta: string) => void;
}

const formatoDia = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}-${mes}-${anio}`;
};

export default function InformeVentasTab({ desde, hasta, onCambioFechas }: Props) {
  const [datos, setDatos] = useState<InformeVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get<InformeVentas>('/informes/ventas', { params: { desde, hasta } });
        if (vigente) setDatos(res.data);
      } catch {
        if (vigente) setError('No se pudo cargar el informe de ventas.');
      } finally {
        if (vigente) setCargando(false);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [desde, hasta]);

  const maxDia = datos ? Math.max(...datos.porDia.map((d) => d.total), 1) : 1;

  return (
    <div>
      <FiltroFechas desde={desde} hasta={hasta} onCambio={onCambioFechas} />

      {error && <p className="text-danger mb-4">{error}</p>}
      {cargando && !datos && <p className="text-ink/50">Cargando...</p>}

      {datos && (
        <div className={cargando ? 'opacity-60 transition' : 'transition'}>
          {/* Resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">Ventas</p>
              <p className="text-xl font-mono font-semibold">{datos.resumen.cantidad}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">Total cobrado</p>
              <p className="text-xl font-mono font-semibold">${datos.resumen.totalCobrado.toLocaleString('es-CL')}</p>
              <p className="text-xs text-ink/40 mt-1 font-mono">
                Neto ${datos.resumen.subtotal.toLocaleString('es-CL')} + IVA ${datos.resumen.iva.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">IVA del período</p>
              <p className="text-xl font-mono font-semibold">${datos.resumen.iva.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">Saldo pendiente</p>
              <p className={`text-xl font-mono font-semibold ${datos.resumen.saldoPendiente > 0 ? 'text-amber-dark' : ''}`}>
                ${datos.resumen.saldoPendiente.toLocaleString('es-CL')}
              </p>
            </div>
          </div>

          {/* Por día */}
          <div className="bg-white border border-ink/10 rounded mb-6">
            <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Ventas por día</h3>
            <div className="p-4 space-y-2">
              {datos.porDia.map((d) => (
                <div key={d.fecha} className="flex items-center gap-3 text-sm">
                  <span className="w-24 font-mono text-ink/60">{formatoDia(d.fecha)}</span>
                  <div className="flex-1 h-5 bg-ink/5 rounded overflow-hidden">
                    <div className="h-full bg-amber" style={{ width: `${(d.total / maxDia) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-ink/50">{d.cantidad}</span>
                  <span className="w-28 text-right font-mono">${d.total.toLocaleString('es-CL')}</span>
                </div>
              ))}
              {datos.porDia.length === 0 && (
                <p className="text-sm text-ink/40 text-center py-4">No hay ventas en este período.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por producto */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Ventas por producto</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                    <th className="py-2 px-4 font-medium">Producto</th>
                    <th className="py-2 px-4 font-medium text-right">cm vendidos</th>
                    <th className="py-2 px-4 font-medium text-right">Monto neto</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porProducto.map((p) => (
                    <tr key={p.productoId} className="border-b border-ink/5 last:border-0 text-sm">
                      <td className="py-2 px-4">
                        {p.nombre}
                        <span className="block text-xs text-ink/40 font-mono">{p.sku}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono">{p.cmVendidos.toLocaleString('es-CL')}</td>
                      <td className="py-2 px-4 text-right font-mono">${p.montoNeto.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                  {datos.porProducto.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-ink/40">Sin datos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Por vendedor */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Ventas por vendedor</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                    <th className="py-2 px-4 font-medium">Vendedor</th>
                    <th className="py-2 px-4 font-medium text-right">Ventas</th>
                    <th className="py-2 px-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porVendedor.map((v) => (
                    <tr key={v.vendedor} className="border-b border-ink/5 last:border-0 text-sm">
                      <td className="py-2 px-4">
                        {v.vendedor === 'Sin vendedor' ? <span className="text-ink/40">{v.vendedor}</span> : v.vendedor}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">{v.cantidad}</td>
                      <td className="py-2 px-4 text-right font-mono">${v.total.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                  {datos.porVendedor.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-ink/40">Sin datos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}