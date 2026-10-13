import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { InformeCuentasPorCobrar } from '../../types/informes';
import { Search, Eye, AlertTriangle } from 'lucide-react';

export default function InformeCuentasPorCobrarTab() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<InformeCuentasPorCobrar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloSobreLimite, setSoloSobreLimite] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get<InformeCuentasPorCobrar>('/informes/cuentas-por-cobrar');
        setDatos(res.data);
      } catch {
        setError('No se pudo cargar el informe de cuentas por cobrar.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    if (!datos) return [];
    return datos.clientes.filter((c) => {
      const texto = busqueda.toLowerCase();
      const coincideTexto = c.nombre.toLowerCase().includes(texto) || c.rut.toLowerCase().includes(texto);
      const coincideLimite = !soloSobreLimite || c.superaLimite;
      return coincideTexto && coincideLimite;
    });
  }, [datos, busqueda, soloSobreLimite]);

  if (cargando) return <p className="text-ink/50">Cargando...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!datos) return null;

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Clientes con deuda</p>
          <p className="text-xl font-mono font-semibold">{datos.resumen.clientesConDeuda}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Deuda total</p>
          <p className="text-xl font-mono font-semibold text-amber-dark">
            ${datos.resumen.deudaTotal.toLocaleString('es-CL')}
          </p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Sobre su límite de crédito</p>
          <p className={`text-xl font-mono font-semibold ${datos.resumen.clientesSobreLimite > 0 ? 'text-danger' : ''}`}>
            {datos.resumen.clientesSobreLimite}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-ink/10 rounded p-4 flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full text-sm"
            placeholder="Buscar por nombre o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 border border-ink/15 rounded px-3 py-2 text-sm text-ink/70 whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={soloSobreLimite}
            onChange={(e) => setSoloSobreLimite(e.target.checked)}
          />
          Solo sobre el límite
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-ink/10 rounded overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">Cliente</th>
              <th className="py-2.5 px-4 font-medium text-right">Límite</th>
              <th className="py-2.5 px-4 font-medium text-right">Deuda</th>
              <th className="py-2.5 px-4 font-medium text-right">Disponible</th>
              <th className="py-2.5 px-4 font-medium text-right">Ventas pendientes</th>
              <th className="py-2.5 px-4 font-medium text-right">Antigüedad</th>
              <th className="py-2.5 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.clienteId} className="border-b border-ink/5 last:border-0 text-sm">
                <td className="py-2.5 px-4">
                  <span className="flex items-center gap-1.5">
                    {c.superaLimite && (
                      <span title="Superó su límite de crédito">
                        <AlertTriangle size={14} className="text-danger shrink-0" />
                      </span>
                    )}
                    {c.nombre}
                    {!c.activo && <span className="text-xs text-ink/40">(inactivo)</span>}
                  </span>
                  <span className="block text-xs text-ink/40 font-mono">{c.rut}</span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono">${c.limiteCredito.toLocaleString('es-CL')}</td>
                <td className="py-2.5 px-4 text-right font-mono font-medium text-amber-dark">
                  ${c.deuda.toLocaleString('es-CL')}
                </td>
                <td className={`py-2.5 px-4 text-right font-mono ${c.disponible < 0 ? 'text-danger' : 'text-teal'}`}>
                  ${c.disponible.toLocaleString('es-CL')}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {c.ventasPendientes > 0 ? (
                    <>
                      <span className="font-mono">{c.ventasPendientes}</span>
                      <span className="block text-xs text-ink/40 font-mono">
                        ${c.saldoEnVentas.toLocaleString('es-CL')}
                      </span>
                    </>
                  ) : (
                    <span className="text-ink/30">-</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {c.diasVentaMasAntigua !== null ? (
                    <span className={c.diasVentaMasAntigua > 30 ? 'text-danger' : ''}>
                      {c.diasVentaMasAntigua} {c.diasVentaMasAntigua === 1 ? 'día' : 'días'}
                    </span>
                  ) : (
                    <span className="text-ink/30">-</span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => navigate(`/clientes/${c.clienteId}`)}
                      className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                      title="Ver ficha y registrar abonos"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink/40">
                  No se encontraron clientes con deuda con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}