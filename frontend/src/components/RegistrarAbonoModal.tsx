import { useState } from 'react';
import { api } from '../api/client';
import Modal from './Modal';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  clienteId: number;
  deudaActual: number;
  onRegistrado: () => void;
}

export default function RegistrarAbonoModal({ abierto, onCerrar, clienteId, deudaActual, onRegistrado }: Props) {
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const limpiarYcerrar = () => {
    setMonto('');
    setMedioPago('EFECTIVO');
    setObservacion('');
    setError('');
    onCerrar();
  };

  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (montoNum > deudaActual) {
      setError(`El monto no puede ser mayor a la deuda actual ($${deudaActual.toLocaleString('es-CL')}).`);
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/clientes/${clienteId}/abonos`, {
        monto: montoNum,
        medioPago,
        observacion: observacion || undefined,
      });
      onRegistrado();
      limpiarYcerrar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al registrar el abono.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Registrar abono" abierto={abierto} onCerrar={limpiarYcerrar}>
      <form onSubmit={registrarAbono}>
        <p className="text-sm text-ink/50 mb-4">
          Deuda actual: <span className="font-mono font-medium text-ink">${deudaActual.toLocaleString('es-CL')}</span>
        </p>

        <label className="block text-sm text-ink/60 mb-1">Monto del abono</label>
        <input
          className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          autoFocus
        />

        <label className="block text-sm text-ink/60 mb-1">Medio de pago</label>
        <select
          className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value)}
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="DEBITO">Débito</option>
          <option value="TRANSFERENCIA">Transferencia</option>
        </select>

        <label className="block text-sm text-ink/60 mb-1">Observación (opcional)</label>
        <input
          className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        {error && <p className="text-danger text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={limpiarYcerrar} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar abono'}
          </button>
        </div>
      </form>
    </Modal>
  );
}