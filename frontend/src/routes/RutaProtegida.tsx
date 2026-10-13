import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  rolesPermitidos?: string[];
}

export default function RutaProtegida({ children, rolesPermitidos }: Props) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Cargando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}