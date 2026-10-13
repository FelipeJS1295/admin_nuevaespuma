import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { InformeProduccion } from '../../types/informes';
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

export default function InformeProduccionTab({ desde, hasta, onCambioFechas }: Props) {
  const [datos, setDatos] = useState<InformeProduccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get<InformeProduccion>('/informes/produccion', { params: { desde, hasta } });
        if (vigente) setDatos(res.data);
      } catch {
        if (vigente) setError('No se pudo cargar el informe de producción.');
      } finally {
        if (vigente) setCargando(false);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [desde, hasta]);

  const maxDia = datos ? Math.max(...datos.porDia.map((d) => d.totalCm), 1) : 1;
  const maxDensidad = datos ? Math.max(...datos.porDensidad.map((d) => d.totalCm), 1) : 1;

  return (
    <div>
      <FiltroFechas desde={desde} hasta={hasta} onCambio={onCambioFechas} />

      {error && <p className="text-danger mb-4">{error}</p>}
      {cargando && !datos && <p className="text-ink/50">Cargando...</p>}

      {datos && (
        <div className={cargando ? 'opacity-60 transition' : 'transition'}>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">Registros de producción</p>
              <p className="text-xl font-mono font-semibold">{datos.resumen.registros}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-xs text-ink/50 mb-1">Total producido</p>
              <p className="text-xl font-mono font-semibold">{datos.resumen.totalCm.toLocaleString('es-CL')} cm</p>
            </div>
          </div>

          {/* Por día */}
          <div className="bg-white border border-ink/10 rounded mb-6">
            <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Producción por día</h3>
            <div className="p-4 space-y-2">
              {datos.porDia.map((d) => (
                <div key={d.fecha} className="flex items-center gap-3 text-sm">
                  <span className="w-24 font-mono text-ink/60">{formatoDia(d.fecha)}</span>
                  <div className="flex-1 h-5 bg-ink/5 rounded overflow-hidden">
                    <div className="h-full bg-amber" style={{ width: `${(d.totalCm / maxDia) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-ink/50">{d.registros}</span>
                  <span className="w-28 text-right font-mono">{d.totalCm.toLocaleString('es-CL')} cm</span>
                </div>
              ))}
              {datos.porDia.length === 0 && (
                <p className="text-sm text-ink/40 text-center py-4">No hay producción en este período.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Por densidad */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Producción por densidad</h3>
              <div className="p-4 space-y-2">
                {datos.porDensidad.map((d) => (
                  <div key={d.densidad} className="flex items-center gap-3 text-sm">
                    <span className="w-16 font-mono text-ink/60">D{d.densidad}</span>
                    <div className="flex-1 h-5 bg-ink/5 rounded overflow-hidden">
                      <div className="h-full bg-teal" style={{ width: `${(d.totalCm / maxDensidad) * 100}%` }} />
                    </div>
                    <span className="w-28 text-right font-mono">{d.totalCm.toLocaleString('es-CL')} cm</span>
                  </div>
                ))}
                {datos.porDensidad.length === 0 && (
                  <p className="text-sm text-ink/40 text-center py-4">Sin datos.</p>
                )}
              </div>
            </div>

            {/* Por bodega */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Producción por bodega</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                    <th className="py-2 px-4 font-medium">Bodega</th>
                    <th className="py-2 px-4 font-medium text-right">Registros</th>
                    <th className="py-2 px-4 font-medium text-right">Total (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porBodega.map((b) => (
                    <tr key={b.bodegaId} className="border-b border-ink/5 last:border-0 text-sm">
                      <td className="py-2 px-4">{b.bodega}</td>
                      <td className="py-2 px-4 text-right font-mono">{b.registros}</td>
                      <td className="py-2 px-4 text-right font-mono">{b.totalCm.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                  {datos.porBodega.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-ink/40">Sin datos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por producto */}
          <div className="bg-white border border-ink/10 rounded overflow-hidden">
            <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Producción por producto</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                  <th className="py-2 px-4 font-medium">Producto</th>
                  <th className="py-2 px-4 font-medium text-right">Densidad</th>
                  <th className="py-2 px-4 font-medium text-right">Registros</th>
                  <th className="py-2 px-4 font-medium text-right">Total (cm)</th>
                </tr>
              </thead>
              <tbody>
                {datos.porProducto.map((p) => (
                  <tr key={p.productoId} className="border-b border-ink/5 last:border-0 text-sm">
                    <td className="py-2 px-4">
                      {p.nombre}
                      <span className="block text-xs text-ink/40 font-mono">{p.sku}</span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono">{p.densidad} kg/m³</td>
                    <td className="py-2 px-4 text-right font-mono">{p.registros}</td>
                    <td className="py-2 px-4 text-right font-mono">{p.totalCm.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
                {datos.porProducto.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-ink/40">Sin datos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}