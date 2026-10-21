import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Venta } from '../types/venta';
import VentaModal from '../components/VentaModal';
import PagarSaldoModal from '../components/PagarSaldoModal';
import RegistrarDocumentoModal from '../components/RegistrarDocumentoModal';
import { Layers, Plus, ChevronDown, ChevronUp, AlertTriangle, CircleDollarSign, Search, X, Trash2 } from 'lucide-react';

const etiquetasMedioPago: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_CLIENTE: 'Crédito',
};

// Fecha local en formato YYYY-MM-DD (lo que entiende el input type="date")
const formatoFecha = (d: Date) => d.toLocaleDateString('en-CA');

const hoy = () => formatoFecha(new Date());

const haceDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return formatoFecha(d);
};

const inicioDeMes = () => {
  const d = new Date();
  return formatoFecha(new Date(d.getFullYear(), d.getMonth(), 1));
};

export default function Ventas() {
  const { usuario } = useAuth();
  const puedeEliminar = usuario?.rol === 'ADMIN_MASTER' || usuario?.rol === 'ADMIN';

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ventaAPagar, setVentaAPagar] = useState<Venta | null>(null);
  const [ventaADocumentar, setVentaADocumentar] = useState<Venta | null>(null);

  // Filtros (por defecto: solo hoy)
  const [desde, setDesde] = useState(hoy());
  const [hasta, setHasta] = useState(hoy());
  const [cliente, setCliente] = useState('');
  const [documento, setDocumento] = useState('');
  const [estado, setEstado] = useState<'todas' | 'pendientes' | 'pagadas'>('todas');

  // Vista de la lista: ventas o resumen de centímetros por densidad
  const [vista, setVista] = useState<'ventas' | 'densidad'>('ventas');

  // Evita que una respuesta lenta pise a una más reciente
  const ultimaPeticion = useRef(0);

  const cargarVentas = async () => {
    const numeroPeticion = ++ultimaPeticion.current;
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cliente.trim()) params.cliente = cliente.trim();
    if (documento.trim()) params.documento = documento.trim();
    if (estado !== 'todas') params.estado = estado;

    const res = await api.get<Venta[]>('/ventas', { params });
    if (numeroPeticion !== ultimaPeticion.current) return;
    setVentas(res.data);
    setCargandoInicial(false);
  };

  // Recarga al cambiar cualquier filtro (con una pequeña espera mientras se escribe)
  useEffect(() => {
    const espera = setTimeout(cargarVentas, 300);
    return () => clearTimeout(espera);
  }, [desde, hasta, cliente, estado, documento]);

  const handleVentaCreada = (nombreClienteSuperaLimite?: string) => {
    if (nombreClienteSuperaLimite) {
      setAviso(`Atención: "${nombreClienteSuperaLimite}" superó su límite de crédito con esta venta.`);
    }
    cargarVentas();
  };

  const eliminarVenta = async (venta: Venta) => {
    const cliente = venta.cliente ? ` de ${venta.cliente.nombre}` : '';
    const confirmado = window.confirm(
      `¿Eliminar la venta #${venta.id}${cliente} por $${venta.total.toLocaleString('es-CL')}?\n\n` +
        'Se devolverá el stock, se quitará del historial y se restará de la deuda del cliente. Esta acción no se puede deshacer.',
    );
    if (!confirmado) return;

    try {
      await api.delete(`/ventas/${venta.id}`);
      if (ventaExpandida === venta.id) setVentaExpandida(null);
      cargarVentas();
    } catch (err: any) {
      setAviso(err.response?.data?.message || 'No se pudo eliminar la venta.');
    }
  };

  const aplicarRango = (nuevoDesde: string, nuevoHasta: string) => {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
  };

  const limpiarFiltros = () => {
    setDesde(hoy());
    setHasta(hoy());
    setCliente('');
    setDocumento('');
    setEstado('todas');
  };

  const esSoloHoy = desde === hoy() && hasta === hoy();
  const hayFiltrosExtra = cliente.trim() !== '' || documento.trim() !== '' || estado !== 'todas' || !esSoloHoy;

  const totalCobrado = ventas.reduce((acc, v) => acc + v.total, 0);
  const totalPendiente = ventas.reduce((acc, v) => acc + v.saldoPendiente, 0);

  // Resumen de centímetros por densidad (sobre las ventas filtradas)
  const resumenDensidad = (() => {
    const mapa = new Map<number, { densidad: number; piezas: number; cm: number; monto: number }>();
    for (const v of ventas) {
      for (const i of v.items) {
        const d = i.producto.densidad;
        const cant = i.cantidad ?? 1;
        const actual = mapa.get(d) ?? { densidad: d, piezas: 0, cm: 0, monto: 0 };
        actual.piezas += cant;
        actual.cm += i.espesorCm * cant;
        actual.monto += i.subtotal;
        mapa.set(d, actual);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.densidad - b.densidad);
  })();
  const totalCmDensidad = resumenDensidad.reduce((acc, d) => acc + d.cm, 0);

  const alternarExpandida = (id: number) => setVentaExpandida(ventaExpandida === id ? null : id);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Ventas</h1>
          <p className="text-ink/50">{esSoloHoy ? 'Ventas registradas hoy' : 'Resultados según los filtros aplicados'}</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setVista(vista === 'densidad' ? 'ventas' : 'densidad')}
          className={`flex items-center gap-1.5 font-medium px-4 py-2 rounded border transition whitespace-nowrap ${
            vista === 'densidad' ? 'bg-graphite text-paper border-graphite' : 'border-ink/20 text-ink/70 hover:bg-ink/5'
          }`}
        >
          <Layers size={18} />
          Centímetros por densidad
        </button>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
        >
          <Plus size={18} />
          Nueva venta
        </button>
        </div>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 bg-amber/10 border border-amber/30 text-amber-dark rounded p-3 mb-6 text-sm">
          <AlertTriangle size={16} />
          {aviso}
          <button onClick={() => setAviso(null)} className="ml-auto text-amber-dark/60 hover:text-amber-dark">✕</button>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="bg-white border border-ink/10 rounded p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-ink/50 mb-1">Desde</label>
              <input
                type="date"
                className="border border-ink/15 rounded px-3 py-2 text-sm"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Hasta</label>
              <input
                type="date"
                className="border border-ink/15 rounded px-3 py-2 text-sm"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-ink/50 mb-1">Cliente</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full text-sm"
                placeholder="Buscar por nombre o RUT..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">N° de documento</label>
            <input
              className="border border-ink/15 rounded px-3 py-2 w-full text-sm lg:w-40"
              placeholder="Factura o nota..."
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Estado de pago</label>
            <select
              className="border border-ink/15 rounded px-3 py-2 text-sm w-full"
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'todas' | 'pendientes' | 'pagadas')}
            >
              <option value="todas">Todas</option>
              <option value="pendientes">Con saldo pendiente</option>
              <option value="pagadas">Pagadas</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-ink/40">Atajos:</span>
          <button
            onClick={() => aplicarRango(hoy(), hoy())}
            className="text-xs px-2.5 py-1 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            Hoy
          </button>
          <button
            onClick={() => aplicarRango(haceDias(6), hoy())}
            className="text-xs px-2.5 py-1 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => aplicarRango(inicioDeMes(), hoy())}
            className="text-xs px-2.5 py-1 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            Este mes
          </button>
          {hayFiltrosExtra && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-ink/50 hover:text-ink"
            >
              <X size={14} />
              Volver a hoy y limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-ink/10 rounded p-5">
          <p className="text-sm text-ink/50">{esSoloHoy ? 'Total vendido hoy' : 'Total cobrado'}</p>
          <p className="text-2xl font-mono font-semibold">${totalCobrado.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-5">
          <p className="text-sm text-ink/50">Cantidad de ventas</p>
          <p className="text-2xl font-mono font-semibold">{ventas.length}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-5">
          <p className="text-sm text-ink/50">Saldo pendiente</p>
          <p className={`text-2xl font-mono font-semibold ${totalPendiente > 0 ? 'text-amber-dark' : ''}`}>
            ${totalPendiente.toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      {cargandoInicial ? (
        <p className="text-ink/50">Cargando...</p>
      ) : vista === 'densidad' ? (
        <div className="bg-white border border-ink/10 rounded overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
                <th className="py-2.5 px-4 font-medium">Densidad</th>
                <th className="py-2.5 px-4 font-medium text-right">Piezas</th>
                <th className="py-2.5 px-4 font-medium text-right">Centímetros vendidos</th>
                <th className="py-2.5 px-4 font-medium text-right">Monto neto</th>
              </tr>
            </thead>
            <tbody>
              {resumenDensidad.map((d) => (
                <tr key={d.densidad} className="border-b border-ink/5 last:border-0">
                  <td className="py-2.5 px-4 font-mono">D{d.densidad}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{d.piezas.toLocaleString('es-CL')}</td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {d.cm.toLocaleString('es-CL', { maximumFractionDigits: 1 })} cm
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">${d.monto.toLocaleString('es-CL')}</td>
                </tr>
              ))}
              {resumenDensidad.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink/40">
                    No hay ventas en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {resumenDensidad.length > 0 && (
              <tfoot>
                <tr className="border-t border-ink/10 bg-ink/[0.02] font-medium">
                  <td className="py-2.5 px-4">Total</td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {resumenDensidad.reduce((a, d) => a + d.piezas, 0).toLocaleString('es-CL')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {totalCmDensidad.toLocaleString('es-CL', { maximumFractionDigits: 1 })} cm
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    ${resumenDensidad.reduce((a, d) => a + d.monto, 0).toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="bg-white border border-ink/10 rounded overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
                <th className="py-2.5 px-4 font-medium">Fecha</th>
                <th className="py-2.5 px-4 font-medium">Bodega</th>
                <th className="py-2.5 px-4 font-medium">Cliente</th>
                <th className="py-2.5 px-4 font-medium">Documento</th>
                <th className="py-2.5 px-4 font-medium">Ítems</th>
                <th className="py-2.5 px-4 font-medium">Total</th>
                <th className="py-2.5 px-4 font-medium">Pendiente</th>
                <th className="py-2.5 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <Fragment key={v.id}>
                  <tr className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-sm cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      {new Date(v.creadoEn).toLocaleDateString('es-CL')}{' '}
                      <span className="text-ink/40">
                        {new Date(v.creadoEn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      {v.bodega.nombre}
                    </td>
                    <td className="py-2.5 px-4 cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      {v.cliente ? v.cliente.nombre : <span className="text-ink/40">Sin cliente</span>}
                    </td>
                    <td className="py-2.5 px-4 text-sm cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      {v.numeroDocumento ? (
                        <span>
                          <span className="text-ink/50">{v.tipoDocumento === 'FACTURA' ? 'Factura' : 'Nota de venta'}</span>{' '}
                          <span className="font-mono">{v.numeroDocumento}</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVentaADocumentar(v);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-amber-dark hover:underline"
                          title="Registrar factura o nota de venta"
                        >
                          <Plus size={12} />
                          Agregar
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-ink/60 text-sm cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      {v.items.length} producto(s)
                    </td>
                    <td className="py-2.5 px-4 font-mono text-sm font-medium cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      ${v.total.toLocaleString('es-CL')}
                    </td>
                    <td className="py-2.5 px-4">
                      {v.saldoPendiente > 0 ? (
                        <span className="text-amber-dark font-mono text-sm font-medium">
                          ${v.saldoPendiente.toLocaleString('es-CL')}
                        </span>
                      ) : (
                        <span className="text-teal text-sm">Pagado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        {v.saldoPendiente > 0 && (
                          <button
                            onClick={() => setVentaAPagar(v)}
                            className="p-1.5 text-amber-dark hover:bg-amber/10 rounded"
                            title="Registrar pago"
                          >
                            <CircleDollarSign size={16} />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button
                            onClick={() => eliminarVenta(v)}
                            className="p-1.5 text-danger/70 hover:text-danger hover:bg-danger/5 rounded"
                            title="Eliminar venta"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button onClick={() => alternarExpandida(v.id)} className="text-ink/40">
                          {ventaExpandida === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {ventaExpandida === v.id && (
                    <tr className="bg-ink/[0.015]">
                      <td colSpan={8} className="px-4 pb-4 pt-1">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-medium text-ink/50 mb-1.5">Productos</p>
                            <div className="space-y-1">
                              {v.items.map((i) => (
                                <div key={i.id} className="flex justify-between text-sm">
                                  <span>{i.cantidad > 1 ? `${i.cantidad} × ` : ''}{i.producto.nombre} · {i.espesorCm}cm</span>
                                  <span className="font-mono">${i.subtotal.toLocaleString('es-CL')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink/50 mb-1.5">Pagos</p>
                            <div className="space-y-1">
                              {v.pagos.map((p) => (
                                <div key={p.id} className="flex justify-between text-sm">
                                  <span>{etiquetasMedioPago[p.medioPago]}</span>
                                  <span className="font-mono">${p.total.toLocaleString('es-CL')}</span>
                                </div>
                              ))}
                              {v.pagos.length === 0 && <p className="text-sm text-ink/40">Sin pagos registrados</p>}
                              {v.saldoPendiente > 0 && (
                                <div className="flex justify-between text-sm text-amber-dark font-medium pt-1 border-t border-ink/10">
                                  <span>Saldo pendiente</span>
                                  <span className="font-mono">${v.saldoPendiente.toLocaleString('es-CL')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink/40">
                    No se encontraron ventas con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <VentaModal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} onVentaCreada={handleVentaCreada} />

            {ventaADocumentar && (
        <RegistrarDocumentoModal
          venta={ventaADocumentar}
          onCerrar={() => setVentaADocumentar(null)}
          onGuardado={cargarVentas}
        />
      )}

      {ventaAPagar && (
        <PagarSaldoModal
          venta={ventaAPagar}
          onCerrar={() => setVentaAPagar(null)}
          onPagado={cargarVentas}
        />
      )}
    </div>
  );
}