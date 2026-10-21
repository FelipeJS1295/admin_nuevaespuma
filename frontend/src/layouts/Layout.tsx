import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Warehouse, Package, Boxes, Users, LayoutDashboard, LogOut, UserCog, ShoppingCart, BarChart3, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const enlaces = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard, roles: ['ADMIN_MASTER', 'ADMIN', 'VENTAS', 'PRODUCCION', 'DESPACHO'] },
  { path: '/bodegas', label: 'Bodegas', icon: Warehouse, roles: ['ADMIN_MASTER', 'ADMIN'] },
  { path: '/productos', label: 'Productos', icon: Package, roles: ['ADMIN_MASTER', 'ADMIN'] },
  { path: '/stock', label: 'Stock', icon: Boxes, roles: ['ADMIN_MASTER', 'ADMIN', 'PRODUCCION'] },
  { path: '/ventas', label: 'Ventas', icon: ShoppingCart, roles: ['ADMIN_MASTER', 'ADMIN', 'VENTAS'] },
  { path: '/despacho', label: 'Despacho', icon: Truck, roles: ['ADMIN_MASTER', 'ADMIN', 'DESPACHO'] },
  { path: '/clientes', label: 'Clientes', icon: Users, roles: ['ADMIN_MASTER', 'ADMIN', 'VENTAS'] },
  { path: '/informes', label: 'Informes', icon: BarChart3, roles: ['ADMIN_MASTER', 'ADMIN'] },
  { path: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['ADMIN_MASTER', 'ADMIN'] },
];

const nombresRol: Record<string, string> = {
  ADMIN_MASTER: 'Administrador Master',
  ADMIN: 'Administrador',
  VENTAS: 'Ventas',
  PRODUCCION: 'Producción',
  DESPACHO: 'Despacho',
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const enlacesVisibles = enlaces.filter((e) => usuario && e.roles.includes(usuario.rol));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-graphite text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-lg font-semibold tracking-tight">Nueva Espuma</p>
          <p className="text-xs text-white/50 mt-0.5 font-mono">Sistema de gestión</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {enlacesVisibles.map((enlace) => {
            const activo = location.pathname === enlace.path;
            const Icon = enlace.icon;
            return (
              <Link
                key={enlace.path}
                to={enlace.path}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                  activo
                    ? 'bg-amber text-graphite font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {enlace.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-2 mb-3">
            <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-white/40 font-mono">{usuario ? nombresRol[usuario.rol] : ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-2 rounded text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}