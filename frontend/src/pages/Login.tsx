import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Factory } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Correo o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8 text-white">
          <Factory size={28} className="text-amber" />
          <span className="text-xl font-semibold">Nueva Espuma</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded p-8">
          <h1 className="text-lg font-semibold text-ink mb-6">Iniciar sesión</h1>

          <label className="block text-sm text-ink/60 mb-1">Correo electrónico</label>
          <input
            type="email"
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />

          <label className="block text-sm text-ink/60 mb-1">Contraseña</label>
          <input
            type="password"
            className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-danger text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="bg-amber text-graphite font-medium px-4 py-2 rounded w-full hover:bg-amber-dark transition disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}