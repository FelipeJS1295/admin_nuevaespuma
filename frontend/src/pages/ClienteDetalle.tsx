import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ClienteDetalle } from '../types/cliente';
import { ArrowLeft, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import RegistrarAbonoModal from '../components/RegistrarAbonoModal';

const etiquetasMedioPago: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_CLIENTE: 'Crédito',
};

export default function ClienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null);
  const [vista, setVista] = useState<'ventas' | 'abonos'>('ventas');

  const cargarDetalle = async () => {
    setCargando(true);
    const res = await api.get<ClienteDetalle>(`/clientes/${id}/detalle`);
    setCliente(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  if (cargando || !cliente) {
    return <div className="p-8 text-ink/50">Cargando...</div>;
  }

  const disponible = cliente.limiteCredito - cliente.creditoUsado;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">{cliente.nombre}</h1>
          <p className="text-ink/50 font-mono text-sm">{cliente.rut}</p>
        </div>
        <button
          onClick={() => setModalAbonoAbierto(true)}
          disabled={cliente.creditoUsado <= 0}
          className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Registrar abono
        </button>
      </div>

      {/* Resumen de crédito */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Límite de crédito</p>
          <p className="text-xl font-mono font-semibold">${cliente.limiteCredito.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Deuda actual</p>
          <p className="text-xl font-mono font-semibold text-danger">${cliente.creditoUsado.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-xs text-ink/50 mb-1">Disponible</p>
          <p className={`text-xl font-mono font-semibold ${disponible <= 0 ? 'text-danger' : 'text-teal'}`}>
            ${disponible.toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-ink/10">
        <button
          onClick={() => setVista('ventas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            vista === 'ventas' ? 'border-amber text-ink' : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Historial de compras ({cliente.ventas.length})
        </button>
        <button
          onClick={() => setVista('abonos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            vista === 'abonos' ? 'border-amber text-ink' : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Abonos ({cliente.abonos.length})
        </button>
      </div>

      {vista === 'ventas' ? (
        <div className="bg-white border border-ink/10 rounded overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
                <th className="py-2.5 px-4 font-medium">Fecha</th>
                <th className="py-2.5 px-4 font-medium">Bodega</th>
                <th className="py-2.5 px-4 font-medium">Ítems</th>
                <th className="py-2.5 px-4 font-medium">Total</th>
                <th className="py-2.5 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {cliente.ventas.map((v) => (
                <>
                  <tr
                    key={v.id}
                    className="border-b border-ink/5 last:border-0 cursor-pointer hover:bg-ink/[0.02]"
                    onClick={() => setVentaExpandida(ventaExpandida === v.id ? null : v.id)}
                  >
                    <td className="py-2.5 px-4 font-mono text-sm">
                      {new Date(v.creadoEn).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-2.5 px-4">{v.bodega.nombre}</td>
                    <td className="py-2.5 px-4 text-ink/60 text-sm">{v.items.length} producto(s)</td>
                    <td className="py-2.5 px-4 font-mono text-sm font-medium">${v.total.toLocaleString('es-CL')}</td>
                    <td className="py-2.5 px-4 text-ink/40">
                      {ventaExpandida === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  {ventaExpandida === v.id && (
                    <tr className="bg-ink/[0.015]">
                      <td colSpan={5} className="px-4 pb-4 pt-1">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-medium text-ink/50 mb-1.5">Productos</p>
                            {v.items.map((i) => (
                              <div key={i.id} className="flex justify-between text-sm">
                                <span>{i.cantidad > 1 ? `${i.cantidad} × ` : ''}{i.producto.nombre} · {i.espesorCm}cm</span>
                                <span className="font-mono">${i.subtotal.toLocaleString('es-CL')}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink/50 mb-1.5">Pagos</p>
                            {v.pagos.map((p) => (
                              <div key={p.id} className="flex justify-between text-sm">
                                <span>{etiquetasMedioPago[p.medioPago]}</span>
                                <span className="font-mono">${p.total.toLocaleString('es-CL')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {cliente.ventas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink/40">Este cliente no tiene compras registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-ink/10 rounded overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
                <th className="py-2.5 px-4 font-medium">Fecha</th>
                <th className="py-2.5 px-4 font-medium">Medio de pago</th>
                <th className="py-2.5 px-4 font-medium">Monto</th>
                <th className="py-2.5 px-4 font-medium">Observación</th>
              </tr>
            </thead>
            <tbody>
              {cliente.abonos.map((a) => (
                <tr key={a.id} className="border-b border-ink/5 last:border-0">
                  <td className="py-2.5 px-4 font-mono text-sm">{new Date(a.creadoEn).toLocaleDateString('es-CL')}</td>
                  <td className="py-2.5 px-4">{etiquetasMedioPago[a.medioPago]}</td>
                  <td className="py-2.5 px-4 font-mono text-sm text-teal font-medium">${a.monto.toLocaleString('es-CL')}</td>
                  <td className="py-2.5 px-4 text-sm text-ink/50">{a.observacion || '-'}</td>
                </tr>
              ))}
              {cliente.abonos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink/40">Este cliente no tiene abonos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <RegistrarAbonoModal
        abierto={modalAbonoAbierto}
        onCerrar={() => setModalAbonoAbierto(false)}
        clienteId={cliente.id}
        deudaActual={cliente.creditoUsado}
        onRegistrado={cargarDetalle}
      />
    </div>
  );
}