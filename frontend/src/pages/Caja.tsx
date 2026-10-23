import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ResumenCaja } from '../types/caja';
import Modal from '../components/Modal';
import FiltroFechas, { rangoPorDefecto } from '../components/FiltroFechas';
import { Banknote, Landmark, ArrowDownCircle, Scale, Plus } from 'lucide-react';

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const hoyLocal = () => new Date().toLocaleDateString('en-CA');
const fechaCorta = (iso: string) => iso.split('-').reverse().join('-');

const DENOMINACIONES: { clave: string; etiqueta: string; valor: number }[] = [
  { clave: 'monedas10', etiqueta: 'Monedas de $10', valor: 10 },
  { clave: 'monedas50', etiqueta: 'Monedas de $50', valor: 50 },
  { clave: 'monedas100', etiqueta: 'Monedas de $100', valor: 100 },
  { clave: 'monedas500', etiqueta: 'Monedas de $500', valor: 500 },
  { clave: 'billetes1000', etiqueta: 'Billetes de $1.000', valor: 1000 },
  { clave: 'billetes2000', etiqueta: 'Billetes de $2.000', valor: 2000 },
  { clave: 'billetes5000', etiqueta: 'Billetes de $5.000', valor: 5000 },
  { clave: 'billetes10000', etiqueta: 'Billetes de $10.000', valor: 10000 },
  { clave: 'billetes20000', etiqueta: 'Billetes de $20.000', valor: 20000 },
];

const mensajeDeError = (err: any, porDefecto: string) => {
  const m = err.response?.data?.message;
  return Array.isArray(m) ? m.join('. ') : m || porDefecto;
};

export default function Caja() {
  const [{ desde, hasta }, setRango] = useState(rangoPorDefecto());
  const [datos, setDatos] = useState<ResumenCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [modal, setModal] = useState<'salida' | 'efectivo' | 'banco' | null>(null);

  const cargar = async () => {
    const res = await api.get<ResumenCaja>('/caja/resumen', { params: { desde, hasta } });
    setDatos(res.data);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, [desde, hasta]);

  const terminado = (texto: string) => {
    setModal(null);
    setAviso({ tipo: 'ok', texto });
    cargar();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Caja</h1>
          <p className="text-ink/50">Efectivo, banco, salidas y cuadres</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('salida')}
            className="flex items-center gap-1.5 border border-ink/20 text-ink/70 font-medium px-3 py-2 rounded hover:bg-ink/5 text-sm"
          >
            <ArrowDownCircle size={16} />
            Salida de efectivo
          </button>
          <button
            onClick={() => setModal('efectivo')}
            className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-3 py-2 rounded hover:bg-amber-dark text-sm"
          >
            <Scale size={16} />
            Cuadrar efectivo
          </button>
          <button
            onClick={() => setModal('banco')}
            className="flex items-center gap-1.5 bg-amber text-graphite font-medium px-3 py-2 rounded hover:bg-amber-dark text-sm"
          >
            <Landmark size={16} />
            Cuadrar banco
          </button>
        </div>
      </div>

      {aviso && (
        <div
          className={`flex items-center gap-2 rounded p-3 mb-6 text-sm border ${
            aviso.tipo === 'ok' ? 'bg-teal/10 border-teal/30 text-teal' : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {aviso.texto}
          <button onClick={() => setAviso(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="mb-6">
        <FiltroFechas desde={desde} hasta={hasta} onCambio={(d, h) => setRango({ desde: d, hasta: h })} />
      </div>

      {cargando || !datos ? (
        <p className="text-ink/50">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-ink/10 rounded p-5">
              <p className="text-sm text-ink/50 flex items-center gap-1.5"><Banknote size={15} /> Efectivo en caja</p>
              <p className="text-2xl font-mono font-semibold">{pesos(datos.saldoEfectivo)}</p>
              <p className="text-xs text-ink/40 mt-1">Acumulado al {fechaCorta(datos.hasta)}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <p className="text-sm text-ink/50 flex items-center gap-1.5"><Landmark size={15} /> Banco (débito + transf.)</p>
              <p className="text-2xl font-mono font-semibold">{pesos(datos.saldoBanco)}</p>
              <p className="text-xs text-ink/40 mt-1">Acumulado al {fechaCorta(datos.hasta)}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <p className="text-sm text-ink/50">Ingresó en el período</p>
              <p className="text-2xl font-mono font-semibold">{pesos(datos.periodo.totalIngresado)}</p>
              <p className="text-xs text-ink/40 mt-1">
                Efectivo {pesos(datos.periodo.efectivo)} · Débito {pesos(datos.periodo.debito)} · Transf.{' '}
                {pesos(datos.periodo.transferencia)}
              </p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <p className="text-sm text-ink/50">Salidas del período</p>
              <p className="text-2xl font-mono font-semibold text-amber-dark">{pesos(datos.periodo.salidas)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Salidas de efectivo</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/50 border-b border-ink/5">
                    <th className="py-2 px-4 font-medium">Fecha</th>
                    <th className="py-2 px-4 font-medium">Concepto</th>
                    <th className="py-2 px-4 font-medium">Responsable</th>
                    <th className="py-2 px-4 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.salidas.map((s) => (
                    <tr key={s.id} className="border-b border-ink/5 last:border-0">
                      <td className="py-2 px-4 font-mono">{fechaCorta(s.fecha)}</td>
                      <td className="py-2 px-4">{s.concepto}</td>
                      <td className="py-2 px-4 text-ink/60">{s.responsable}</td>
                      <td className="py-2 px-4 text-right font-mono">{pesos(s.monto)}</td>
                    </tr>
                  ))}
                  {datos.salidas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-ink/40">Sin salidas en este período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-ink/10 rounded overflow-hidden">
              <h3 className="text-sm font-medium text-ink px-4 py-3 border-b border-ink/10">Historial de cuadres</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/50 border-b border-ink/5">
                    <th className="py-2 px-4 font-medium">Fecha</th>
                    <th className="py-2 px-4 font-medium">Tipo</th>
                    <th className="py-2 px-4 font-medium text-right">Contado</th>
                    <th className="py-2 px-4 font-medium text-right">Sistema</th>
                    <th className="py-2 px-4 font-medium text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.cuadres.map((c) => (
                    <tr key={c.id} className="border-b border-ink/5 last:border-0 align-top">
                      <td className="py-2 px-4 font-mono">
                        {fechaCorta(c.fecha)}
                        {c.registradoPor && <div className="text-xs text-ink/40 font-sans">{c.registradoPor}</div>}
                      </td>
                      <td className="py-2 px-4">{c.tipo === 'EFECTIVO' ? 'Efectivo' : 'Banco'}</td>
                      <td className="py-2 px-4 text-right font-mono">{pesos(c.contado)}</td>
                      <td className="py-2 px-4 text-right font-mono">{pesos(c.sistema)}</td>
                      <td
                        className={`py-2 px-4 text-right font-mono font-medium ${
                          Math.abs(c.diferencia) < 1 ? 'text-teal' : c.diferencia < 0 ? 'text-danger' : 'text-amber-dark'
                        }`}
                      >
                        {c.diferencia > 0 ? '+' : ''}
                        {pesos(c.diferencia)}
                      </td>
                    </tr>
                  ))}
                  {datos.cuadres.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-ink/40">Aún no hay cuadres.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SalidaModal abierto={modal === 'salida'} onCerrar={() => setModal(null)} onListo={() => terminado('Salida de efectivo registrada.')} />
      <CuadreEfectivoModal abierto={modal === 'efectivo'} onCerrar={() => setModal(null)} onListo={() => terminado('Cuadre de efectivo registrado.')} />
      <CuadreBancoModal abierto={modal === 'banco'} onCerrar={() => setModal(null)} onListo={() => terminado('Cuadre de banco registrado.')} />
    </div>
  );
}

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onListo: () => void;
}

function SalidaModal({ abierto, onCerrar, onListo }: ModalProps) {
  const [fecha, setFecha] = useState(hoyLocal());
  const [concepto, setConcepto] = useState('');
  const [responsable, setResponsable] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError('');
    if (!concepto.trim() || !responsable.trim() || !(Number(monto) > 0)) {
      return setError('Completa concepto, responsable y un monto mayor a 0.');
    }
    setGuardando(true);
    try {
      await api.post('/caja/salidas', { fecha, concepto, responsable, monto: Number(monto) });
      setConcepto('');
      setResponsable('');
      setMonto('');
      onListo();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No se pudo registrar la salida.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Salida de efectivo" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-ink/60 mb-1">Fecha</label>
          <input type="date" className="border border-ink/15 rounded px-3 py-2 w-full" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Concepto</label>
          <input className="border border-ink/15 rounded px-3 py-2 w-full" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: compra de insumos" />
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Responsable</label>
          <input className="border border-ink/15 rounded px-3 py-2 w-full" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Quién retiró el dinero" />
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Monto</label>
          <input type="number" className="border border-ink/15 rounded px-3 py-2 w-full" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full bg-amber text-graphite font-medium py-2 rounded hover:bg-amber-dark disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Plus size={16} />
          {guardando ? 'Guardando...' : 'Registrar salida'}
        </button>
      </div>
    </Modal>
  );
}

function CuadreEfectivoModal({ abierto, onCerrar, onListo }: ModalProps) {
  const [fecha, setFecha] = useState(hoyLocal());
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const contado = DENOMINACIONES.reduce((acc, d) => acc + (Number(cantidades[d.clave]) || 0) * d.valor, 0);

  const guardar = async () => {
    setError('');
    setGuardando(true);
    try {
      const cuerpo: Record<string, unknown> = { fecha, observaciones: observaciones || undefined };
      for (const d of DENOMINACIONES) cuerpo[d.clave] = Math.max(0, Math.floor(Number(cantidades[d.clave]) || 0));
      await api.post('/caja/cuadres/efectivo', cuerpo);
      setCantidades({});
      setObservaciones('');
      onListo();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No se pudo registrar el cuadre.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Cuadrar caja en efectivo" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-ink/60 mb-1">Fecha del cuadre</label>
          <input type="date" className="border border-ink/15 rounded px-3 py-2 w-full" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {DENOMINACIONES.map((d) => (
            <div key={d.clave}>
              <label className="block text-xs text-ink/50 mb-0.5">{d.etiqueta}</label>
              <input
                type="number"
                min={0}
                className="border border-ink/15 rounded px-2 py-1.5 w-full text-sm"
                value={cantidades[d.clave] ?? ''}
                placeholder="0"
                onChange={(e) => setCantidades((c) => ({ ...c, [d.clave]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center bg-ink/[0.03] rounded p-3">
          <span className="text-sm text-ink/60">Total contado</span>
          <span className="text-xl font-bold font-mono">{pesos(contado)}</span>
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Observaciones (opcional)</label>
          <textarea className="border border-ink/15 rounded px-3 py-2 w-full text-sm" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full bg-amber text-graphite font-medium py-2 rounded hover:bg-amber-dark disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Registrar cuadre'}
        </button>
        <p className="text-xs text-ink/40">El sistema compara lo contado con: pagos en efectivo + abonos en efectivo − salidas, hasta la fecha elegida.</p>
      </div>
    </Modal>
  );
}

function CuadreBancoModal({ abierto, onCerrar, onListo }: ModalProps) {
  const [fecha, setFecha] = useState(hoyLocal());
  const [saldo, setSaldo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError('');
    if (saldo === '' || Number(saldo) < 0) return setError('Indica el saldo del banco.');
    setGuardando(true);
    try {
      await api.post('/caja/cuadres/banco', { fecha, saldoBanco: Number(saldo), observaciones: observaciones || undefined });
      setSaldo('');
      setObservaciones('');
      onListo();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No se pudo registrar el cuadre.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Cuadrar caja del banco" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-ink/60 mb-1">Fecha del cuadre</label>
          <input type="date" className="border border-ink/15 rounded px-3 py-2 w-full" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Saldo según el banco</label>
          <input type="number" className="border border-ink/15 rounded px-3 py-2 w-full" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-ink/60 mb-1">Observaciones (opcional)</label>
          <textarea className="border border-ink/15 rounded px-3 py-2 w-full text-sm" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full bg-amber text-graphite font-medium py-2 rounded hover:bg-amber-dark disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Registrar cuadre'}
        </button>
        <p className="text-xs text-ink/40">El sistema compara con: pagos con débito y transferencia + abonos por esos medios, hasta la fecha elegida.</p>
      </div>
    </Modal>
  );
}
