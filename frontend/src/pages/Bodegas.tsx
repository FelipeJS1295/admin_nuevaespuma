import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Bodega } from '../types/bodega';
import Modal from '../components/Modal';
import { Pencil, Power, Plus } from 'lucide-react';

export default function Bodegas() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Formulario de creación
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  // Modal de edición
  const [bodegaEditando, setBodegaEditando] = useState<Bodega | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [ubicacionEdit, setUbicacionEdit] = useState('');
  const [errorEdit, setErrorEdit] = useState('');

  const cargarBodegas = async () => {
    setCargando(true);
    const res = await api.get<Bodega[]>('/bodegas');
    setBodegas(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarBodegas();
  }, []);

  const crearBodega = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    try {
      await api.post('/bodegas', { nombre, ubicacion: ubicacion || undefined });
      setNombre('');
      setUbicacion('');
      cargarBodegas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al crear la bodega.');
    }
  };

  const abrirEdicion = (bodega: Bodega) => {
    setBodegaEditando(bodega);
    setNombreEdit(bodega.nombre);
    setUbicacionEdit(bodega.ubicacion || '');
    setErrorEdit('');
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodegaEditando) return;
    setErrorEdit('');
    try {
      await api.patch(`/bodegas/${bodegaEditando.id}`, {
        nombre: nombreEdit,
        ubicacion: ubicacionEdit || undefined,
      });
      setBodegaEditando(null);
      cargarBodegas();
    } catch (err: any) {
      setErrorEdit(err.response?.data?.message || 'Ocurrió un error al guardar.');
    }
  };

  const alternarEstado = async (bodega: Bodega) => {
    const confirmacion = bodega.activa
      ? `¿Desactivar la bodega "${bodega.nombre}"?`
      : `¿Reactivar la bodega "${bodega.nombre}"?`;
    if (!window.confirm(confirmacion)) return;

    if (bodega.activa) {
      await api.delete(`/bodegas/${bodega.id}`);
    } else {
      await api.patch(`/bodegas/${bodega.id}`, { activa: true });
    }
    cargarBodegas();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-1">Bodegas</h1>
      <p className="text-ink/50 mb-6">Administra las bodegas y puntos de almacenamiento</p>

      <form onSubmit={crearBodega} className="bg-white border border-ink/10 rounded p-5 flex flex-col md:flex-row gap-2 mb-6">
        <input
          className="border border-ink/15 rounded px-3 py-2 flex-1"
          placeholder="Nombre de la bodega"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="border border-ink/15 rounded px-3 py-2 flex-1"
          placeholder="Ubicación (opcional)"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
        >
          <Plus size={18} />
          Crear bodega
        </button>
      </form>

      {error && <p className="text-danger mb-4">{error}</p>}

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : (
        <table className="w-full border-collapse bg-white border border-ink/10 rounded overflow-hidden">
          <thead>
            <tr className="text-left border-b border-ink/10 bg-ink/[0.02] text-sm text-ink/60">
              <th className="py-2.5 px-4 font-medium">Nombre</th>
              <th className="py-2.5 px-4 font-medium">Ubicación</th>
              <th className="py-2.5 px-4 font-medium">Estado</th>
              <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bodegas.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 px-4">{b.nombre}</td>
                <td className="py-2.5 px-4 text-ink/60">{b.ubicacion || '-'}</td>
                <td className="py-2.5 px-4">
                  {b.activa ? (
                    <span className="inline-flex items-center gap-1.5 text-teal text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ink/40 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink/30" /> Inactiva
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => abrirEdicion(b)}
                      className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => alternarEstado(b)}
                      className={`p-1.5 rounded hover:bg-ink/5 ${b.activa ? 'text-danger/70 hover:text-danger' : 'text-teal/70 hover:text-teal'}`}
                      title={b.activa ? 'Desactivar' : 'Reactivar'}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal titulo="Editar bodega" abierto={!!bodegaEditando} onCerrar={() => setBodegaEditando(null)}>
        <form onSubmit={guardarEdicion}>
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Ubicación</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            value={ubicacionEdit}
            onChange={(e) => setUbicacionEdit(e.target.value)}
          />
          {errorEdit && <p className="text-danger text-sm mb-3">{errorEdit}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setBodegaEditando(null)}
              className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}