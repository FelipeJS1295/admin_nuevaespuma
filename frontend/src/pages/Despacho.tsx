import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { VentaDespacho } from '../types/despacho';
import { Search, Truck, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const formatoFecha = (d: Date) => d.toLocaleDateString('en-CA');
const nf = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });

const etiquetaEstado = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber/15 text-amber-dark' },
  PARCIAL: { texto: 'Parcial', clase: 'bg-teal/15 text-teal' },
  COMPLETO: { texto: 'Entregada', clase: 'bg-ink/10 text-ink/60' },
} as const;

export default function Despacho() {
  const [ventas, setVentas] = useState<VentaDespacho[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<'pendientes' | 'todas'>('pendientes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cliente, setCliente] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Piezas a despachar ahora: { ventaItemId: cantidad }
  const [seleccion, setSeleccion] = useState<Record<number, number>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [historialAbierto, setHistorialAbierto] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);

  const ultimaPeticion = useRef(0);

  const cargar = async () => {
    const n = ++ultimaPeticion.current;
    const params: Record<string, string> = { estado };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cliente.trim()) params.cliente = cliente.trim();
    const res = await api.get<VentaDespacho[]>('/despachos', { params });
    if (n !== ultimaPeticion.current) return;
    setVentas(res.data);
    setCargando(false);
  };

  useEffect(() => {
    const espera = setTimeout(cargar, 300);
    return () => clearTimeout(espera);
  }, [estado, desde, hasta, cliente]);

  const cambiarCantidad = (itemId: number, valor: number, max: number) => {
    const v = Math.min(max, Math.max(0, Math.floor(valor) || 0));
    setSeleccion((s) => ({ ...s, [itemId]: v }));
  };

  const despacharTodo = (v: VentaDespacho) => {
    const nuevo = { ...seleccion };
    for (const i of v.items) nuevo[i.id] = i.pendiente;
    setSeleccion(nuevo);
  };

  const confirmar = async (v: VentaDespacho) => {
    const items = v.items
      .filter((i) => (seleccion[i.id] ?? 0) > 0)
      .map((i) => ({ ventaItemId: i.id, cantidad: seleccion[i.id] }));
    if (items.length === 0) {
      setAviso({ tipo: 'error', texto: `Indica cuántas piezas despachar de la venta #${v.id}.` });
      return;
    }
    setGuardando(v.id);
    try {
      await api.post(`/despachos/venta/${v.id}`, { items, observacion: observaciones[v.id] || undefined });
      const limpio = { ...seleccion };
      for (const i of v.items) delete limpio[i.id];
      setSeleccion(limpio);
      setObservaciones((o) => ({ ...o, [v.id]: '' }));
      setAviso({ tipo: 'ok', texto: `Despacho registrado en la venta #${v.id}.` });
      await cargar();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setAviso({ tipo: 'error', texto: Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el despacho.' });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink mb-1">Despacho</h1>
        <p className="text-ink/50">Entrega las ventas completas o por partes. Lo que no se lleva el cliente queda pendiente.</p>
      </div>

      {aviso && (
        <div
          className={`flex items-center gap-2 rounded p-3 mb-6 text-sm border ${
            aviso.tipo === 'ok' ? 'bg-teal/10 border-teal/30 text-teal' : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {aviso.texto}
          <button onClick={() => setAviso(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="bg-white border border-ink/10 rounded p-4 mb-6 flex flex-col lg:flex-row gap-3">
        <div>
          <label className="block text-xs text-ink/50 mb-1">Mostrar</label>
          <select
            className="border border-ink/15 rounded px-3 py-2 text-sm w-full"
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'pendientes' | 'todas')}
          >
            <option value="pendientes">Con piezas por entregar</option>
            <option value="todas">Todas (incluye entregadas)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Desde</label>
          <input type="date" className="border border-ink/15 rounded px-3 py-2 text-sm" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Hasta</label>
          <input type="date" className="border border-ink/15 rounded px-3 py-2 text-sm" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
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
        <div className="flex items-end gap-2">
          <button
            onClick={() => { setDesde(formatoFecha(new Date())); setHasta(formatoFecha(new Date())); }}
            className="text-xs px-2.5 py-2 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            Solo hoy
          </button>
          {(desde || hasta || cliente) && (
            <button
              onClick={() => { setDesde(''); setHasta(''); setCliente(''); }}
              className="text-xs px-2.5 py-2 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : ventas.length === 0 ? (
        <div className="bg-white border border-ink/10 rounded p-10 text-center text-ink/40">
          <CheckCircle2 className="mx-auto mb-2" />
          No hay ventas por despachar.
        </div>
      ) : (
        <div className="space-y-4">
          {ventas.map((v) => {
            const e = etiquetaEstado[v.estadoEntrega];
            const entregada = v.estadoEntrega === 'COMPLETO';
            const hayCantidad = v.items.some((i) => (seleccion[i.id] ?? 0) > 0);
            return (
              <div key={v.id} className="bg-white border border-ink/10 rounded overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 border-b border-ink/10 bg-ink/[0.02]">
                  <span className="font-semibold">Venta #{v.id}</span>
                  <span className="text-sm">{v.cliente ? v.cliente.nombre : <span className="text-ink/40">Sin cliente</span>}</span>
                  <span className="text-sm text-ink/50">{v.bodega.nombre}</span>
                  <span className="text-sm font-mono text-ink/50">
                    {new Date(v.creadoEn).toLocaleDateString('es-CL')}{' '}
                    {new Date(v.creadoEn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${e.clase}`}>{e.texto}</span>
                </div>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-ink/50 border-b border-ink/5">
                      <th className="py-2 px-4 font-medium">Producto</th>
                      <th className="py-2 px-4 font-medium text-right">Piezas</th>
                      <th className="py-2 px-4 font-medium text-right">Despachadas</th>
                      <th className="py-2 px-4 font-medium text-right">Pendientes</th>
                      <th className="py-2 px-4 font-medium text-right">Cm pendientes</th>
                      {!entregada && <th className="py-2 px-4 font-medium text-right">Despachar ahora</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {v.items.map((i) => (
                      <tr key={i.id} className="border-b border-ink/5 last:border-0 text-sm">
                        <td className="py-2 px-4">
                          {i.producto.nombre} <span className="text-ink/40">· D{i.producto.densidad}</span>
                          <span className="text-ink/50"> · {nf(i.espesorCm)} cm c/u</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">
                          {i.cantidad} <span className="text-ink/40">({nf(i.cantidad * i.espesorCm)} cm)</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{i.cantidadDespachada}</td>
                        <td className={`py-2 px-4 text-right font-mono ${i.pendiente > 0 ? 'text-amber-dark font-medium' : 'text-ink/40'}`}>
                          {i.pendiente}
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{nf(i.pendiente * i.espesorCm)} cm</td>
                        {!entregada && (
                          <td className="py-2 px-4 text-right">
                            {i.pendiente > 0 ? (
                              <input
                                type="number"
                                min={0}
                                max={i.pendiente}
                                step={1}
                                className="border border-ink/15 rounded px-2 py-1 w-20 text-sm text-right"
                                value={seleccion[i.id] ?? ''}
                                placeholder="0"
                                onChange={(ev) => cambiarCantidad(i.id, Number(ev.target.value), i.pendiente)}
                              />
                            ) : (
                              <span className="text-ink/30">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!entregada && (
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-ink/10 bg-ink/[0.02]">
                    <input
                      className="border border-ink/15 rounded px-3 py-1.5 text-sm flex-1 min-w-48"
                      placeholder="Observación (patente, quién retira...) opcional"
                      value={observaciones[v.id] ?? ''}
                      onChange={(ev) => setObservaciones((o) => ({ ...o, [v.id]: ev.target.value }))}
                    />
                    <button
                      onClick={() => despacharTodo(v)}
                      className="text-sm px-3 py-1.5 rounded border border-ink/20 text-ink/70 hover:bg-ink/5"
                    >
                      Despachar todo lo pendiente
                    </button>
                    <button
                      onClick={() => confirmar(v)}
                      disabled={!hayCantidad || guardando === v.id}
                      className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded bg-amber text-graphite hover:bg-amber-dark transition disabled:opacity-40"
                    >
                      <Truck size={16} />
                      {guardando === v.id ? 'Guardando...' : 'Confirmar despacho'}
                    </button>
                  </div>
                )}

                {v.despachos.length > 0 && (
                  <div className="border-t border-ink/10">
                    <button
                      onClick={() => setHistorialAbierto(historialAbierto === v.id ? null : v.id)}
                      className="w-full flex items-center gap-1 px-4 py-2 text-xs text-ink/50 hover:bg-ink/[0.02]"
                    >
                      {historialAbierto === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Historial de despachos ({v.despachos.length})
                    </button>
                    {historialAbierto === v.id && (
                      <ul className="px-4 pb-3 space-y-1 text-sm">
                        {v.despachos.map((d) => (
                          <li key={d.id} className="text-ink/70">
                            <span className="font-mono text-ink/50">
                              {new Date(d.creadoEn).toLocaleDateString('es-CL')}{' '}
                              {new Date(d.creadoEn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {' · '}
                            {d.items
                              .map((di) => {
                                const it = v.items.find((x) => x.id === di.ventaItemId);
                                return `${di.cantidad} × ${it ? it.producto.nombre : 'producto'}`;
                              })
                              .join(', ')}
                            {d.usuario && <span className="text-ink/40"> · {d.usuario.nombre}</span>}
                            {d.observacion && <span className="text-ink/40"> · {d.observacion}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
