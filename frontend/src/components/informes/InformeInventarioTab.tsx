import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { InformeInventario } from '../../types/informes';
import FiltroFechas from '../FiltroFechas';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  desde: string;
  hasta: string;
  onCambioFechas: (desde: string, hasta: string) => void;
}

const etiquetasMovimiento: Record<string, string> = {
  PRODUCCION: 'Producción',
  VENTA: 'Ventas',
  TRANSFERENCIA_SALIDA: 'Transferencias (salida)',
  TRANSFERENCIA_ENTRADA: 'Transferencias (entrada)',
  AJUSTE: 'Ajustes',
};

export default function InformeInventarioTab({ desde, hasta, onCambioFechas }: Props) {
  const [datos, setDatos] = useState<InformeInventario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [bodegaExpandida, setBodegaExpandida] = useState<number | null>(null);

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get<InformeInventario>('/informes/inventario', { params: { desde, hasta } });
        if (vigente) setDatos(res.data);
      } catch {
        if (vigente) setError('No se pudo cargar el informe de inventario.');
      } finally {
        if (vigente) setCargando(false);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [desde, hasta]);

  const maxDensidad = datos ? Math.max(...datos.densidadesMasVendidas.map((d) => d.cmVendidos), 1) : 1;

  return (
    <div>
      <FiltroFechas desde={desde} hasta={hasta} onCambio={onCambioFechas} />

      {error && <p className="text-danger mb-4">{error}</p>}
      {cargando && !datos && <p className="text-ink/50">Cargando...</p>}

      {datos && (
        <div className={cargando ? 'opacity-60 transition' : 'transition'}>
          {/* Alerta de stock negativo */}
          {datos.stockNegativo.length > 0 && (
            <div className="bg-white border border-danger/30 rounded p-4 mb-6">
              <div className="flex items-center gap-2 text-danger font-medium text-sm mb-2">
                <AlertTriangle size={16} />
                Stock negativo ({datos.stockNegativo.length})
              </div>
              <ul className="space-y-1 text-sm">
                {datos.stockNegativo.map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {s.producto} <span className="text-ink/40">en {s.bodega}</span>
                    </span>
                    <span className="font-mono text-danger">{s.cantidad.toLocaleString('es-CL')} cm</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stock actual por bodega */}
          <div className="bg-white border border-ink/10 rounded mb-6 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
              <h3 className="text-sm font-medium text-ink">Stock actual por bodega</h3>
              <span className="text-xs text-ink/40">Foto de hoy, no depende de las fechas</span>
            </div>
            <div className="px-4 py-3 border-b border-ink/10 bg-ink/[0.02] flex justify-between text-sm">
              <span className="text-ink/60">Stock total</span>
              <span className="font-mono font-semibold">{datos.stockTotalCm.toLocaleString('es-CL')} cm</span>
            </div>
            {datos.porBodega.map((b) => (
              <div key={b.bodegaId} className="border-b border-ink/5 last:border-0">
                <button
                  onClick={() => setBodegaExpandida(bodegaExpandida === b.bodegaId ? null : b.bodegaId)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-ink/[0.02]"
                >
                  <span className="font-medium">{b.bodega}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono">{b.totalCm.toLocaleString('es-CL')} cm</span>
                    {bodegaExpandida === b.bodegaId ? (
                      <ChevronUp size={16} className="text-ink/40" />
                    ) : (
                      <ChevronDown size={16} className="text-ink/40" />
                    )}
                  </span>
                </button>
                {bodegaExpandida === b.bodegaId && (
                  <div className="px-4 pb-3 space-y-1">
                    {b.productos.map((p) => (
                      <div key={p.productoId} className="flex justify-between text-sm pl-3">
                        <span>
                          {p.nombre} <span className="text-xs text-ink/40 font-mono">{p.sku}</span>
                        </span>
                        <span className={`font-mono ${p.cantidad < 0 ? 'text-danger' : ''}`}>
                          {p.cantidad.toLocaleString('es-CL')} cm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {datos.porBodega.length === 0 && (
              <p className="py-6 text-center text-sm text-ink/40">Todavía no hay stock registrado.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movimientos del período */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">
                Movimientos del período
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-xs text-ink/60">
                    <th className="py-2 px-4 font-medium">Tipo</th>
                    <th className="py-2 px-4 font-medium text-right">Movimientos</th>
                    <th className="py-2 px-4 font-medium text-right">Total (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.movimientosPorTipo.map((m) => (
                    <tr key={m.tipo} className="border-b border-ink/5 last:border-0 text-sm">
                      <td className="py-2 px-4">{etiquetasMovimiento[m.tipo] ?? m.tipo}</td>
                      <td className="py-2 px-4 text-right font-mono">{m.cantidadMovimientos}</td>
                      <td
                        className={`py-2 px-4 text-right font-mono font-medium ${
                          m.totalCm < 0 ? 'text-danger' : 'text-teal'
                        }`}
                      >
                        {m.totalCm > 0 ? '+' : ''}
                        {m.totalCm.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                  {datos.movimientosPorTipo.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-ink/40">
                        No hay movimientos en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Densidades más vendidas */}
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">
                Densidades más vendidas
              </h3>
              <div className="p-4 space-y-2">
                {datos.densidadesMasVendidas.map((d) => (
                  <div key={d.densidad} className="flex items-center gap-3 text-sm">
                    <span className="w-20 font-mono text-ink/60">D{d.densidad}</span>
                    <div className="flex-1 h-5 bg-ink/5 rounded overflow-hidden">
                      <div className="h-full bg-teal" style={{ width: `${(d.cmVendidos / maxDensidad) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right font-mono">{d.cmVendidos.toLocaleString('es-CL')} cm</span>
                  </div>
                ))}
                {datos.densidadesMasVendidas.length === 0 && (
                  <p className="text-sm text-ink/40 text-center py-4">No hay ventas en este período.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}