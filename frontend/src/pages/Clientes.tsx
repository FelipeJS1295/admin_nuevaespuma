import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Cliente } from '../types/cliente';
import Modal from '../components/Modal';
import ImportarClientesModal from '../components/ImportarClientesModal';
import { Pencil, Power, Plus, Search, FileSpreadsheet, Eye } from 'lucide-react';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [soloAlLimite, setSoloAlLimite] = useState(false);

  // Modal de creación
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');
  const [conFactura, setConFactura] = useState(false);
  const [error, setError] = useState('');

  // Modal de edición
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [limiteCreditoEdit, setLimiteCreditoEdit] = useState('');
  const [conFacturaEdit, setConFacturaEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  const cargarClientes = async () => {
    setCargando(true);
    const res = await api.get<Cliente[]>('/clientes');
    setClientes(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const coincideTexto =
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.rut.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && c.activo) ||
        (filtroEstado === 'inactivos' && !c.activo);
      const disponible = c.limiteCredito - c.creditoUsado;
      const coincideLimite = !soloAlLimite || disponible <= 0;
      return coincideTexto && coincideEstado && coincideLimite;
    });
  }, [clientes, busqueda, filtroEstado, soloAlLimite]);

    const cerrarModalCrear = () => {
    setConFactura(false);
    setModalCrearAbierto(false);
    setRut('');
    setNombre('');
    setLimiteCredito('');
    setError('');
  };

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rut.trim() || !nombre.trim()) {
      setError('RUT y nombre son obligatorios.');
      return;
    }
    try {
      await api.post('/clientes', {
        rut,
        nombre,
        limiteCredito: limiteCredito ? Number(limiteCredito) : 0,
        conFactura,
      });
      cerrarModalCrear();
      cargarClientes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al crear el cliente.');
    }
  };

  const abrirEdicion = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setNombreEdit(cliente.nombre);
    setLimiteCreditoEdit(String(cliente.limiteCredito));
    setConFacturaEdit(cliente.conFactura);
    setErrorEdit('');
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteEditando) return;
    setErrorEdit('');
    try {
      await api.patch(`/clientes/${clienteEditando.id}`, {
        nombre: nombreEdit,
        limiteCredito: Number(limiteCreditoEdit),
        conFactura: conFacturaEdit,
      });
      setClienteEditando(null);
      cargarClientes();
    } catch (err: any) {
      setErrorEdit(err.response?.data?.message || 'Ocurrió un error al guardar.');
    }
  };

  const alternarEstado = async (cliente: Cliente) => {
    const confirmacion = cliente.activo
      ? `¿Desactivar al cliente "${cliente.nombre}"?`
      : `¿Reactivar al cliente "${cliente.nombre}"?`;
    if (!window.confirm(confirmacion)) return;

    if (cliente.activo) {
      await api.delete(`/clientes/${cliente.id}`);
    } else {
      await api.patch(`/clientes/${cliente.id}`, { activo: true });
    }
    cargarClientes();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Clientes</h1>
          <p className="text-ink/50">Gestión de clientes y líneas de crédito</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalImportarAbierto(true)}
            className="flex items-center gap-1.5 border border-ink/15 text-ink/70 font-medium px-4 py-2 rounded hover:bg-ink/5 transition whitespace-nowrap"
          >
            <FileSpreadsheet size={18} />
            Importar Excel
          </button>
          <button
            onClick={() => setModalCrearAbierto(true)}
            className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
          >
            <Plus size={18} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border border-ink/10 rounded p-4 flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full"
            placeholder="Buscar por nombre o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="border border-ink/15 rounded px-3 py-2"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
        >
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <label className="flex items-center gap-2 border border-ink/15 rounded px-3 py-2 text-sm text-ink/70 whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={soloAlLimite}
            onChange={(e) => setSoloAlLimite(e.target.checked)}
          />
          Solo al límite de crédito
        </label>
      </div>

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : (
        <table className="w-full border-collapse bg-white border border-ink/10 rounded overflow-hidden">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">RUT</th>
              <th className="py-2.5 px-4 font-medium">Nombre</th>
              <th className="py-2.5 px-4 font-medium">Límite crédito</th>
              <th className="py-2.5 px-4 font-medium">Usado</th>
              <th className="py-2.5 px-4 font-medium">Disponible</th>
              <th className="py-2.5 px-4 font-medium">Estado</th>
              <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => {
              const disponible = c.limiteCredito - c.creditoUsado;
              return (
                <tr key={c.id} className="border-b border-ink/5 last:border-0">
                  <td className="py-2.5 px-4 font-mono text-sm">{c.rut}</td>
                    <td className="py-2.5 px-4">
                    {c.nombre}
                    {c.conFactura && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber/15 text-amber-dark">Factura</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-sm">${c.limiteCredito.toLocaleString('es-CL')}</td>
                  <td className="py-2.5 px-4 font-mono text-sm">${c.creditoUsado.toLocaleString('es-CL')}</td>
                  <td className={`py-2.5 px-4 font-mono text-sm font-medium ${disponible <= 0 ? 'text-danger' : 'text-teal'}`}>
                    ${disponible.toLocaleString('es-CL')}
                  </td>
                  <td className="py-2.5 px-4">
                    {c.activo ? (
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
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                        title="Ver ficha completa"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => abrirEdicion(c)}
                        className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => alternarEstado(c)}
                        className={`p-1.5 rounded hover:bg-ink/5 ${c.activo ? 'text-danger/70 hover:text-danger' : 'text-teal/70 hover:text-teal'}`}
                        title={c.activo ? 'Desactivar' : 'Reactivar'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink/40">
                  No se encontraron clientes con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal Crear */}
      <Modal titulo="Nuevo cliente" abierto={modalCrearAbierto} onCerrar={cerrarModalCrear}>
        <form onSubmit={crearCliente}>
          <label className="block text-sm text-ink/60 mb-1">RUT</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Límite de crédito</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            type="number"
            value={limiteCredito}
            onChange={(e) => setLimiteCredito(e.target.value)}
          />
                    <label className="flex items-start gap-2 text-sm text-ink/70 mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={conFactura}
              onChange={(e) => setConFactura(e.target.checked)}
            />
            <span>
              Cliente con factura
              <span className="block text-xs text-ink/40">Todas sus ventas llevarán IVA</span>
            </span>
          </label>
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cerrarModalCrear} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Crear cliente
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal titulo="Editar cliente" abierto={!!clienteEditando} onCerrar={() => setClienteEditando(null)}>
        <form onSubmit={guardarEdicion}>
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Límite de crédito</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-1"
            type="number"
            value={limiteCreditoEdit}
            onChange={(e) => setLimiteCreditoEdit(e.target.value)}
          />
          {clienteEditando && (
            <p className="text-xs text-ink/40 mb-4">
              Crédito ya usado: ${clienteEditando.creditoUsado.toLocaleString('es-CL')} (no editable aquí)
            </p>
          )}
                   <label className="flex items-start gap-2 text-sm text-ink/70 mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={conFacturaEdit}
              onChange={(e) => setConFacturaEdit(e.target.checked)}
            />
            <span>
              Cliente con factura
              <span className="block text-xs text-ink/40">Afecta solo a las ventas nuevas</span>
            </span>
          </label>
          {errorEdit && <p className="text-danger text-sm mb-3">{errorEdit}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setClienteEditando(null)} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>

      <ImportarClientesModal
        abierto={modalImportarAbierto}
        onCerrar={() => setModalImportarAbierto(false)}
        onImportado={cargarClientes}
      />
    </div>
  );
}