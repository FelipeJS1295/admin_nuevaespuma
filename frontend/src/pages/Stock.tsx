import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Stock } from '../types/stock';
import type { Bodega } from '../types/bodega';
import type { Producto } from '../types/producto';
import type { MovimientoStock } from '../types/movimiento';
import Modal from '../components/Modal';
import { Plus, PackagePlus } from 'lucide-react';

const etiquetasMovimiento: Record<string, string> = {
  PRODUCCION: 'Producción',
  VENTA: 'Venta',
  TRANSFERENCIA_SALIDA: 'Transferencia (salida)',
  TRANSFERENCIA_ENTRADA: 'Transferencia (entrada)',
  AJUSTE: 'Ajuste',
};

export default function StockPage() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<'stock' | 'movimientos'>('stock');

  // Modal de producción
  const [modalAbierto, setModalAbierto] = useState(false);
  const [prodBodegaId, setProdBodegaId] = useState('');
  const [prodProductoId, setProdProductoId] = useState('');
  const [cantidadBloques, setCantidadBloques] = useState('');
  const [alturaBloqueCm, setAlturaBloqueCm] = useState('');
  const [error, setError] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    const [resStock, resMovimientos, resBodegas, resProductos] = await Promise.all([
      api.get<Stock[]>('/stock'),
      api.get<MovimientoStock[]>('/stock/movimientos'),
      api.get<Bodega[]>('/bodegas'),
      api.get<Producto[]>('/productos'),
    ]);
    setStock(resStock.data);
    setMovimientos(resMovimientos.data);
    setBodegas(resBodegas.data);
    setProductos(resProductos.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cerrarModal = () => {
    setModalAbierto(false);
    setProdBodegaId('');
    setProdProductoId('');
    setCantidadBloques('');
    setAlturaBloqueCm('');
    setError('');
  };

  const registrarProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!prodBodegaId || !prodProductoId || !cantidadBloques || !alturaBloqueCm) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    try {
      await api.post('/stock/produccion', {
        bodegaId: Number(prodBodegaId),
        productoId: Number(prodProductoId),
        cantidadBloques: Number(cantidadBloques),
        alturaBloqueCm: Number(alturaBloqueCm),
      });
      cerrarModal();
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar producción.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Stock</h1>
          <p className="text-ink/50">Inventario por bodega y trazabilidad de movimientos</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
        >
          <PackagePlus size={18} />
          Registrar producción
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ink/10">
        <button
          onClick={() => setVista('stock')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            vista === 'stock' ? 'border-amber text-ink' : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Inventario actual
        </button>
        <button
          onClick={() => setVista('movimientos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            vista === 'movimientos' ? 'border-amber text-ink' : 'border-transparent text-ink/50 hover:text-ink'
          }`}
        >
          Historial de movimientos
        </button>
      </div>

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : vista === 'stock' ? (
        <table className="w-full border-collapse bg-white border border-ink/10 rounded overflow-hidden">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">Bodega</th>
              <th className="py-2.5 px-4 font-medium">Producto</th>
              <th className="py-2.5 px-4 font-medium">Densidad</th>
              <th className="py-2.5 px-4 font-medium">Stock (cm)</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 px-4">{s.bodega.nombre}</td>
                <td className="py-2.5 px-4">{s.producto.nombre}</td>
                <td className="py-2.5 px-4 font-mono text-sm">{s.producto.densidad} kg/m³</td>
                <td className={`py-2.5 px-4 font-mono text-sm font-medium ${s.cantidad < 0 ? 'text-danger' : ''}`}>
                  {s.cantidad.toLocaleString('es-CL')} cm
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-ink/40">
                  Todavía no hay stock registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="w-full border-collapse bg-white border border-ink/10 rounded overflow-hidden">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">Fecha</th>
              <th className="py-2.5 px-4 font-medium">Tipo</th>
              <th className="py-2.5 px-4 font-medium">Bodega</th>
              <th className="py-2.5 px-4 font-medium">Producto</th>
              <th className="py-2.5 px-4 font-medium">Cantidad</th>
              <th className="py-2.5 px-4 font-medium">Observación</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 px-4 text-sm text-ink/60 font-mono">
                  {new Date(m.creadoEn).toLocaleString('es-CL')}
                </td>
                <td className="py-2.5 px-4 text-sm">{etiquetasMovimiento[m.tipo]}</td>
                <td className="py-2.5 px-4">{m.bodega.nombre}</td>
                <td className="py-2.5 px-4">{m.producto.nombre}</td>
                <td className={`py-2.5 px-4 font-mono text-sm font-medium ${m.cantidad < 0 ? 'text-danger' : 'text-teal'}`}>
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad.toLocaleString('es-CL')} cm
                </td>
                <td className="py-2.5 px-4 text-sm text-ink/50">{m.observacion || '-'}</td>
              </tr>
            ))}
            {movimientos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/40">
                  Todavía no hay movimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal titulo="Registrar producción" abierto={modalAbierto} onCerrar={cerrarModal}>
        <form onSubmit={registrarProduccion}>
          <label className="block text-sm text-ink/60 mb-1">Bodega</label>
          <select
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={prodBodegaId}
            onChange={(e) => setProdBodegaId(e.target.value)}
          >
            <option value="">Selecciona bodega</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
          <label className="block text-sm text-ink/60 mb-1">Producto</label>
          <select
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={prodProductoId}
            onChange={(e) => setProdProductoId(e.target.value)}
          >
            <option value="">Selecciona producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} (D{p.densidad})</option>
            ))}
          </select>
          <label className="block text-sm text-ink/60 mb-1">Cantidad de bloques</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            type="number"
            value={cantidadBloques}
            onChange={(e) => setCantidadBloques(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Altura de cada bloque (cm)</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            type="number"
            value={alturaBloqueCm}
            onChange={(e) => setAlturaBloqueCm(e.target.value)}
          />
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Registrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}