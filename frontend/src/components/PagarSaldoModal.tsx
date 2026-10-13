import { useState } from 'react';
import { api } from '../api/client';
import Modal from './Modal';
import type { Venta } from '../types/venta';

interface Props {
  venta: Venta;
  onCerrar: () => void;
  onPagado: () => void;
}

export default function PagarSaldoModal({ venta, onCerrar, onPagado }: Props) {
  const [monto, setMonto] = useState(String(venta.saldoPendiente));
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [conIva, setConIva] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const TASA_IVA = 0.19;
  const montoNum = Number(monto) || 0;
  const ivaCalculado = conIva ? Math.round(montoNum * TASA_IVA) : 0;
  const totalACobrar = montoNum + ivaCalculado;

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (montoNum > venta.saldoPendiente + 0.01) {
      setError(`El monto no puede ser mayor al saldo pendiente ($${venta.saldoPendiente.toLocaleString('es-CL')}).`);
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/ventas/${venta.id}/pagos`, { monto: montoNum, medioPago, conIva });
      onPagado();
      onCerrar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Registrar pago — Venta #${venta.id}`} abierto onCerrar={onCerrar}>
      <form onSubmit={registrarPago}>
        <p className="text-sm text-ink/50 mb-4">
          Saldo pendiente: <span className="font-mono font-medium text-ink">${venta.saldoPendiente.toLocaleString('es-CL')}</span>
        </p>

        <label className="block text-sm text-ink/60 mb-1">Monto (neto)</label>
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

        <label className="flex items-center gap-2 text-sm text-ink/70 mb-4 cursor-pointer">
          <input type="checkbox" checked={conIva} onChange={(e) => setConIva(e.target.checked)} />
          Incluye IVA (19%)
        </label>

        {conIva && montoNum > 0 && (
          <p className="text-sm text-ink/50 mb-4 -mt-2">
            Total a cobrar: <span className="font-mono font-medium text-ink">${totalACobrar.toLocaleString('es-CL')}</span>
          </p>
        )}

        {error && <p className="text-danger text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}