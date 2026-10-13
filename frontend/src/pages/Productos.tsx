import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Producto } from '../types/producto';
import Modal from '../components/Modal';
import { Pencil, Power, Plus, Search } from 'lucide-react';

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroDensidad, setFiltroDensidad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal de creación
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [densidad, setDensidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');

  // Modal de edición
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [densidadEdit, setDensidadEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [errorEdit, setErrorEdit] = useState('');

  const cargarProductos = async () => {
    setCargando(true);
    const res = await api.get<Producto[]>('/productos');
    setProductos(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const densidadesDisponibles = useMemo(
    () => Array.from(new Set(productos.map((p) => p.densidad))).sort((a, b) => a - b),
    [productos],
  );

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideTexto =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.sku.toLowerCase().includes(busqueda.toLowerCase());
      const coincideDensidad = !filtroDensidad || p.densidad === Number(filtroDensidad);
      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && p.activo) ||
        (filtroEstado === 'inactivos' && !p.activo);
      return coincideTexto && coincideDensidad && coincideEstado;
    });
  }, [productos, busqueda, filtroDensidad, filtroEstado]);

  const cerrarModalCrear = () => {
    setModalCrearAbierto(false);
    setSku('');
    setNombre('');
    setDensidad('');
    setPrecio('');
    setError('');
  };

  const crearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!sku.trim() || !nombre.trim() || !densidad || !precio) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    try {
      await api.post('/productos', {
        sku,
        nombre,
        densidad: Number(densidad),
        precio: Number(precio),
      });
      cerrarModalCrear();
      cargarProductos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al crear el producto.');
    }
  };

  const abrirEdicion = (producto: Producto) => {
    setProductoEditando(producto);
    setNombreEdit(producto.nombre);
    setDensidadEdit(String(producto.densidad));
    setPrecioEdit(String(producto.precio));
    setErrorEdit('');
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEditando) return;
    setErrorEdit('');
    try {
      await api.patch(`/productos/${productoEditando.id}`, {
        nombre: nombreEdit,
        densidad: Number(densidadEdit),
        precio: Number(precioEdit),
      });
      setProductoEditando(null);
      cargarProductos();
    } catch (err: any) {
      setErrorEdit(err.response?.data?.message || 'Ocurrió un error al guardar.');
    }
  };

  const alternarEstado = async (producto: Producto) => {
    const confirmacion = producto.activo
      ? `¿Desactivar el producto "${producto.nombre}"?`
      : `¿Reactivar el producto "${producto.nombre}"?`;
    if (!window.confirm(confirmacion)) return;

    if (producto.activo) {
      await api.delete(`/productos/${producto.id}`);
    } else {
      await api.patch(`/productos/${producto.id}`, { activo: true });
    }
    cargarProductos();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Productos</h1>
          <p className="text-ink/50">Catálogo de espumas por densidad</p>
        </div>
        <button
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
        >
          <Plus size={18} />
          Nuevo producto
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border border-ink/10 rounded p-4 flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="border border-ink/15 rounded px-3 py-2"
          value={filtroDensidad}
          onChange={(e) => setFiltroDensidad(e.target.value)}
        >
          <option value="">Todas las densidades</option>
          {densidadesDisponibles.map((d) => (
            <option key={d} value={d}>{d} kg/m³</option>
          ))}
        </select>
        <select
          className="border border-ink/15 rounded px-3 py-2"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
        >
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : (
        <table className="w-full border-collapse bg-white border border-ink/10 rounded overflow-hidden">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">SKU</th>
              <th className="py-2.5 px-4 font-medium">Nombre</th>
              <th className="py-2.5 px-4 font-medium">Densidad</th>
              <th className="py-2.5 px-4 font-medium">Precio por cm</th>
              <th className="py-2.5 px-4 font-medium">Estado</th>
              <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 px-4 font-mono text-sm">{p.sku}</td>
                <td className="py-2.5 px-4">{p.nombre}</td>
                <td className="py-2.5 px-4 font-mono text-sm">{p.densidad} kg/m³</td>
                <td className="py-2.5 px-4 font-mono text-sm">${p.precio.toLocaleString('es-CL')}</td>
                <td className="py-2.5 px-4">
                  {p.activo ? (
                    <span className="inline-flex items-center gap-1.5 text-teal text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ink/40 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink/30" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => abrirEdicion(p)}
                      className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => alternarEstado(p)}
                      className={`p-1.5 rounded hover:bg-ink/5 ${p.activo ? 'text-danger/70 hover:text-danger' : 'text-teal/70 hover:text-teal'}`}
                      title={p.activo ? 'Desactivar' : 'Reactivar'}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {productosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/40">
                  No se encontraron productos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal Crear */}
      <Modal titulo="Nuevo producto" abierto={modalCrearAbierto} onCerrar={cerrarModalCrear}>
        <form onSubmit={crearProducto}>
          <label className="block text-sm text-ink/60 mb-1">SKU</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Densidad (kg/m³)</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            type="number"
            value={densidad}
            onChange={(e) => setDensidad(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Precio por cm</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cerrarModalCrear} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Crear producto
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal titulo="Editar producto" abierto={!!productoEditando} onCerrar={() => setProductoEditando(null)}>
        <form onSubmit={guardarEdicion}>
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Densidad (kg/m³)</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            type="number"
            value={densidadEdit}
            onChange={(e) => setDensidadEdit(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Precio por cm</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            type="number"
            value={precioEdit}
            onChange={(e) => setPrecioEdit(e.target.value)}
          />
          {errorEdit && <p className="text-danger text-sm mb-3">{errorEdit}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setProductoEditando(null)} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}