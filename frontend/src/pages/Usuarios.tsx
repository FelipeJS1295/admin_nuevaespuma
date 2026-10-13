import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Usuario, Rol } from '../types/usuario';
import Modal from '../components/Modal';
import { Pencil, Power, Plus, Search } from 'lucide-react';

const rolesDisponibles: { value: Rol; label: string }[] = [
  { value: 'ADMIN_MASTER', label: 'Administrador Master' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'PRODUCCION', label: 'Producción' },
  { value: 'DESPACHO', label: 'Despacho' },
];

export default function Usuarios() {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Un ADMIN (no master) no puede asignar el rol ADMIN_MASTER
  const rolesQuePuedeAsignar = rolesDisponibles.filter(
    (r) => usuarioActual?.rol === 'ADMIN_MASTER' || r.value !== 'ADMIN_MASTER',
  );

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal de creación
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol | ''>('');
  const [error, setError] = useState('');

  // Modal de edición
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [rolEdit, setRolEdit] = useState<Rol | ''>('');
  const [passwordEdit, setPasswordEdit] = useState('');
  const [errorEdit, setErrorEdit] = useState('');

  const cargarUsuarios = async () => {
    setCargando(true);
    const res = await api.get<Usuario[]>('/usuarios');
    setUsuarios(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const coincideTexto =
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(busqueda.toLowerCase());
      const coincideRol = !filtroRol || u.rol === filtroRol;
      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && u.activo) ||
        (filtroEstado === 'inactivos' && !u.activo);
      return coincideTexto && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const cerrarModalCrear = () => {
    setModalCrearAbierto(false);
    setEmail('');
    setPassword('');
    setNombre('');
    setRol('');
    setError('');
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim() || !nombre.trim() || !rol) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    try {
      await api.post('/usuarios', { email, password, nombre, rol });
      cerrarModalCrear();
      cargarUsuarios();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al crear el usuario.');
    }
  };

  const abrirEdicion = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setNombreEdit(usuario.nombre);
    setRolEdit(usuario.rol);
    setPasswordEdit('');
    setErrorEdit('');
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    setErrorEdit('');
    try {
      const data: any = { nombre: nombreEdit, rol: rolEdit };
      if (passwordEdit.trim()) data.password = passwordEdit;
      await api.patch(`/usuarios/${usuarioEditando.id}`, data);
      setUsuarioEditando(null);
      cargarUsuarios();
    } catch (err: any) {
      setErrorEdit(err.response?.data?.message || 'Ocurrió un error al guardar.');
    }
  };

  const alternarEstado = async (usuario: Usuario) => {
    const confirmacion = usuario.activo
      ? `¿Desactivar al usuario "${usuario.nombre}"?`
      : `¿Reactivar al usuario "${usuario.nombre}"?`;
    if (!window.confirm(confirmacion)) return;

    if (usuario.activo) {
      await api.delete(`/usuarios/${usuario.id}`);
    } else {
      await api.patch(`/usuarios/${usuario.id}`, { activo: true });
    }
    cargarUsuarios();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Usuarios</h1>
          <p className="text-ink/50">Gestión de accesos y roles del sistema</p>
        </div>
        <button
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition whitespace-nowrap"
        >
          <Plus size={18} />
          Nuevo usuario
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border border-ink/10 rounded p-4 flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="border border-ink/15 rounded px-3 py-2"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {rolesDisponibles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
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
              <th className="py-2.5 px-4 font-medium">Nombre</th>
              <th className="py-2.5 px-4 font-medium">Correo</th>
              <th className="py-2.5 px-4 font-medium">Rol</th>
              <th className="py-2.5 px-4 font-medium">Estado</th>
              <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2.5 px-4">{u.nombre}</td>
                <td className="py-2.5 px-4 font-mono text-sm">{u.email}</td>
                <td className="py-2.5 px-4">{rolesDisponibles.find((r) => r.value === u.rol)?.label}</td>
                <td className="py-2.5 px-4">
                  {u.activo ? (
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
                      onClick={() => abrirEdicion(u)}
                      className="p-1.5 text-ink/50 hover:text-ink hover:bg-ink/5 rounded"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => alternarEstado(u)}
                      disabled={u.id === usuarioActual?.id}
                      className={`p-1.5 rounded hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed ${u.activo ? 'text-danger/70 hover:text-danger' : 'text-teal/70 hover:text-teal'}`}
                      title={u.id === usuarioActual?.id ? 'No puedes desactivar tu propia cuenta' : u.activo ? 'Desactivar' : 'Reactivar'}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/40">
                  No se encontraron usuarios con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal Crear */}
      <Modal titulo="Nuevo usuario" abierto={modalCrearAbierto} onCerrar={cerrarModalCrear}>
        <form onSubmit={crearUsuario}>
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Correo</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Contraseña</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Rol</label>
          <select
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
          >
            <option value="">Selecciona un rol</option>
            {rolesQuePuedeAsignar.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cerrarModalCrear} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            <button type="submit" className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition">
              Crear usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal titulo="Editar usuario" abierto={!!usuarioEditando} onCerrar={() => setUsuarioEditando(null)}>
        <form onSubmit={guardarEdicion}>
          <label className="block text-sm text-ink/60 mb-1">Nombre</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
          />
          <label className="block text-sm text-ink/60 mb-1">Rol</label>
          <select
            className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
            value={rolEdit}
            onChange={(e) => setRolEdit(e.target.value as Rol)}
          >
            {rolesQuePuedeAsignar.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <label className="block text-sm text-ink/60 mb-1">Nueva contraseña (opcional)</label>
          <input
            className="border border-ink/15 rounded px-3 py-2 w-full mb-1"
            type="password"
            placeholder="Dejar en blanco para no cambiarla"
            value={passwordEdit}
            onChange={(e) => setPasswordEdit(e.target.value)}
          />
          <p className="text-xs text-ink/40 mb-4">Correo: {usuarioEditando?.email} (no editable)</p>
          {errorEdit && <p className="text-danger text-sm mb-3">{errorEdit}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setUsuarioEditando(null)} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
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