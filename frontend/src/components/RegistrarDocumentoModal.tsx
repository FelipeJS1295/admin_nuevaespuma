import { useState } from 'react';
import { api } from '../api/client';
import Modal from './Modal';
import type { Venta } from '../types/venta';

interface Props {
  venta: Venta;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function RegistrarDocumentoModal({ venta, onCerrar, onGuardado }: Props) {
  const [tipo, setTipo] = useState<'' | 'FACTURA' | 'NOTA_VENTA'>('');
  const [numero, setNumero] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tipo) return setError('Elige si es Factura o Nota de venta.');
    if (!numero.trim()) return setError('Escribe el número del documento.');

    setGuardando(true);
    try {
      await api.patch(`/ventas/${venta.id}/documento`, {
        tipoDocumento: tipo,
        numeroDocumento: numero.trim(),
      });
      onGuardado();
      onCerrar();
    } catch (err: any) {
      const mensaje = err.response?.data?.message;
      setError(Array.isArray(mensaje) ? mensaje.join('. ') : mensaje || 'No se pudo registrar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Registrar documento — Venta #${venta.id}`} abierto onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <p className="text-sm text-ink/50 mb-4">
          {venta.cliente ? venta.cliente.nombre : 'Sin cliente'} ·{' '}
          <span className="font-mono">${venta.total.toLocaleString('es-CL')}</span>
        </p>

        <label className="block text-sm text-ink/60 mb-1">Tipo de documento</label>
        <select
          className="border border-ink/15 rounded px-3 py-2 w-full mb-3"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as '' | 'FACTURA' | 'NOTA_VENTA')}
          autoFocus
        >
          <option value="">Selecciona...</option>
          <option value="FACTURA">Factura</option>
          <option value="NOTA_VENTA">Nota de venta</option>
        </select>

        <label className="block text-sm text-ink/60 mb-1">Número</label>
        <input
          className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
          maxLength={30}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />

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
            {guardando ? 'Guardando...' : 'Guardar documento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}