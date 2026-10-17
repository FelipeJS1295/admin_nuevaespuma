import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Bodega } from '../types/bodega';
import type { Producto } from '../types/producto';
import type { Cliente } from '../types/cliente';
import type { MedioPago } from '../types/venta';
import Modal from './Modal';
import { Plus, Trash2, Search } from 'lucide-react';

interface ItemCarrito {
  productoId: number;
  nombre: string;
  densidad: number;
  precioPorCm: number;
  espesorCm: number;
}

interface PagoForm {
  medioPago: MedioPago;
  monto: string; // monto neto ya confirmado: es el que usan todos los cálculos
  borrador: string; // lo que se está escribiendo; pasa a "monto" al salir del campo
  conIva: boolean;
}

interface EstadoCredito {
  diasCredito: number;
  vencida: boolean;
  montoVencido: number;
  ventasVencidas: number;
  fechaVencimientoMasAntigua: string | null;
  diasVencida: number;
  proximoVencimiento: string | null;
}

const pagoVacio = (): PagoForm => ({ medioPago: 'EFECTIVO', monto: '', borrador: '', conIva: false });

const etiquetasMedioPago: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_CLIENTE: 'Crédito del cliente',
};

const TASA_IVA = 0.19;

const pesos = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('es-CL')}`;

// Fechas en formato AAAA-MM-DD (lo que entiende el campo de fecha)
const hoyLocal = () => new Date().toLocaleDateString('en-CA');

const sumarDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA');
};

const fechaLarga = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onVentaCreada: (nombreClienteSuperaLimite?: string) => void;
}

export default function VentaModal({ abierto, onCerrar, onVentaCreada }: Props) {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [bodegaId, setBodegaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [buscadorClienteAbierto, setBuscadorClienteAbierto] = useState(false);
  const [estadoCredito, setEstadoCredito] = useState<EstadoCredito | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'' | 'FACTURA' | 'NOTA_VENTA'>('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [pagos, setPagos] = useState<PagoForm[]>([pagoVacio()]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const cargar = async () => {
      const [b, p, c] = await Promise.all([
        api.get<Bodega[]>('/bodegas'),
        api.get<Producto[]>('/productos'),
        api.get<Cliente[]>('/clientes'),
      ]);
      const bodegasActivas = b.data.filter((x) => x.activa);
      setBodegas(bodegasActivas);
      setProductos(p.data.filter((x) => x.activo));
      setClientes(c.data.filter((x) => x.activo));

      const bodegaCentral = bodegasActivas.find((x) => x.nombre.toLowerCase().includes('central'));
      if (bodegaCentral) {
        setBodegaId(String(bodegaCentral.id));
      }
    };
    cargar();
  }, [abierto]);

  // Al elegir un cliente, consulta si tiene deuda vencida
  useEffect(() => {
    if (!clienteId) {
      setEstadoCredito(null);
      return;
    }
    let vigente = true;
    const cargar = async () => {
      try {
        const res = await api.get<EstadoCredito>(`/clientes/${clienteId}/estado-credito`);
        if (vigente) setEstadoCredito(res.data);
      } catch {
        if (vigente) setEstadoCredito(null);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [clienteId]);

  const productosFiltrados = useMemo(
    () => productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos, busqueda],
  );

  const subtotal = useMemo(
    () => carrito.reduce((acc, i) => acc + i.precioPorCm * i.espesorCm, 0),
    [carrito],
  );

  const clienteSeleccionado = clientes.find((c) => c.id === Number(clienteId));

  // Si el cliente es "con factura", todos los pagos llevan IVA
  const clienteConFactura = clienteSeleccionado?.conFactura ?? false;

  const conIvaEn = (p: PagoForm) => clienteConFactura || p.conIva;
  const montoNeto = (p: PagoForm) => Number(p.monto) || 0;
  const ivaDe = (p: PagoForm) => (conIvaEn(p) ? Math.round(montoNeto(p) * TASA_IVA) : 0);
  const cobrarDe = (p: PagoForm) => montoNeto(p) + ivaDe(p);

  // Todos los cálculos usan solo los montos ya confirmados (no lo que se está escribiendo)
  const sumaMontosNetos = pagos.reduce((acc, p) => acc + montoNeto(p), 0);
  const ivaTotal = pagos.reduce((acc, p) => acc + ivaDe(p), 0);
  const totalConIva = subtotal + ivaTotal;
  const restante = subtotal - sumaMontosNetos;

  // Lo que esta venta le sumaría a la deuda: pagos con crédito (con IVA) + lo que quede pendiente
  const montoQueAfectaCredito =
    pagos.filter((p) => p.medioPago === 'CREDITO_CLIENTE').reduce((acc, p) => acc + cobrarDe(p), 0) +
    (restante > 0.5 ? restante : 0);

  const creditoDisponible = clienteSeleccionado
    ? clienteSeleccionado.limiteCredito - clienteSeleccionado.creditoUsado
    : 0;

  const superaLimiteCredito =
    !!clienteSeleccionado && montoQueAfectaCredito > 0 && montoQueAfectaCredito > creditoDisponible;

  // Con deuda vencida no se vende a crédito (sí se puede vender si se paga completo)
  const bloqueadoPorVencida = !!estadoCredito?.vencida && montoQueAfectaCredito > 0;

  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 8);
    return clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
          c.rut.toLowerCase().includes(busquedaCliente.toLowerCase()),
      )
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  const seleccionarCliente = (id: number) => {
    const elegido = clientes.find((x) => x.id === id);
    setClienteId(String(id));
    // Fecha propuesta: hoy + los días de crédito del cliente (vacía si no tiene plazo definido)
    setFechaVencimiento(elegido && elegido.diasCredito > 0 ? sumarDias(elegido.diasCredito) : '');
    setBuscadorClienteAbierto(false);
    setBusquedaCliente('');
  };

  const quitarCliente = () => {
    setClienteId('');
    setFechaVencimiento('');
    setBusquedaCliente('');
  };

  const agregarProducto = (producto: Producto) => {
    const yaExiste = carrito.find((i) => i.productoId === producto.id);
    if (yaExiste) return;
    setCarrito([
      ...carrito,
      { productoId: producto.id, nombre: producto.nombre, densidad: producto.densidad, precioPorCm: producto.precio, espesorCm: 1 },
    ]);
  };

  const actualizarEspesor = (productoId: number, espesorCm: number) => {
    setCarrito(carrito.map((i) => (i.productoId === productoId ? { ...i, espesorCm } : i)));
  };

  const quitarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter((i) => i.productoId !== productoId));
  };

  const agregarPago = () => {
    setPagos((prev) => [...prev, pagoVacio()]);
  };

  const cambiarMedioPago = (index: number, medioPago: MedioPago) => {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, medioPago } : p)));
  };

  const cambiarIva = (index: number, conIva: boolean) => {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, conIva } : p)));
  };

  // Mientras se escribe, solo cambia el borrador: no se recalcula nada
  const escribirMonto = (index: number, borrador: string) => {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, borrador } : p)));
  };

  // Al salir del campo (Tab, clic fuera o Enter) el borrador pasa a ser el monto y se calcula
  const confirmarMonto = (index: number) => {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, monto: p.borrador } : p)));
  };

  const quitarPago = (index: number) => {
    setPagos((prev) => prev.filter((_, i) => i !== index));
  };

  const limpiarYcerrar = () => {
    setTipoDocumento('');
    setNumeroDocumento('');
    setBodegaId('');
    setClienteId('');
    setEstadoCredito(null);
    setFechaVencimiento('');
    setBusquedaCliente('');
    setBuscadorClienteAbierto(false);
    setBusqueda('');
    setCarrito([]);
    setPagos([pagoVacio()]);
    setError('');
    onCerrar();
  };

  const finalizarVenta = async () => {
    setError('');
    if (pagos.some((p) => p.borrador !== p.monto)) {
      return setError('Confirma los montos de los pagos (Tab o clic fuera del campo) antes de finalizar.');
    }
    if (!bodegaId) return setError('Selecciona una bodega.');
    if (carrito.length === 0) return setError('Agrega al menos un producto al carrito.');
    if (restante < -0.5) return setError('La suma de los pagos supera el subtotal de la venta.');
    if (tipoDocumento && !numeroDocumento.trim()) {
      return setError('Escribe el número del documento, o elige "Sin documento".');
    }

    const hayCredito = pagos.some((p) => p.medioPago === 'CREDITO_CLIENTE' && Number(p.monto) > 0);
    const quedaPendiente = restante > 0.5;
    if ((hayCredito || quedaPendiente) && !clienteId) {
      return setError('Selecciona un cliente para usar "Crédito del cliente" o dejar saldo pendiente.');
    }

    if (montoQueAfectaCredito > 0 && clienteId) {
      if (!fechaVencimiento) return setError('Indica la fecha de vencimiento del crédito.');
      if (fechaVencimiento < hoyLocal()) return setError('La fecha de vencimiento no puede ser anterior a hoy.');
    }

    setGuardando(true);
    try {
      const res = await api.post('/ventas', {
        bodegaId: Number(bodegaId),
        clienteId: clienteId ? Number(clienteId) : undefined,
        tipoDocumento: tipoDocumento || undefined,
        numeroDocumento: tipoDocumento ? numeroDocumento.trim() : undefined,
        fechaVencimiento: montoQueAfectaCredito > 0 && clienteId ? fechaVencimiento : undefined,
        items: carrito.map((i) => ({ productoId: i.productoId, espesorCm: i.espesorCm })),
        pagos: pagos
          .filter((p) => Number(p.monto) > 0)
          .map((p) => ({ medioPago: p.medioPago, monto: Number(p.monto), conIva: conIvaEn(p) })),
      });
      onVentaCreada(res.data.superaLimite ? clienteSeleccionado?.nombre : undefined);
      limpiarYcerrar();
    } catch (err: any) {
      const mensaje = err.response?.data?.message;
      setError(Array.isArray(mensaje) ? mensaje.join('. ') : mensaje || 'Ocurrió un error al registrar la venta.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Nueva venta" abierto={abierto} onCerrar={limpiarYcerrar} ancho="xl">
      <div className="-m-5">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-ink/10">
          {/* Columna izquierda: catálogo */}
          <div className="p-5">
            <label className="block text-sm text-ink/60 mb-1">Bodega</label>
            <select
              className="border border-ink/15 rounded px-3 py-2 w-full mb-4"
              value={bodegaId}
              onChange={(e) => setBodegaId(e.target.value)}
            >
              <option value="">Selecciona bodega</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>

            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {productosFiltrados.map((p) => (
                <div key={p.id} className="border border-ink/10 rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.nombre}</p>
                    <p className="text-xs text-ink/50 font-mono">${p.precio.toLocaleString('es-CL')} / cm</p>
                  </div>
                  <button
                    onClick={() => agregarProducto(p)}
                    className="p-1.5 bg-amber/10 text-amber-dark rounded hover:bg-amber/20"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: carrito + pagos */}
          <div className="p-5 flex flex-col">
            <h3 className="text-sm font-medium text-ink/70 mb-2">Detalle de la venta</h3>
            <div className="flex-1 space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {carrito.length === 0 && (
                <p className="text-sm text-ink/40 py-6 text-center">Agrega productos desde la izquierda</p>
              )}
              {carrito.map((i) => (
                <div key={i.productoId} className="border border-ink/10 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{i.nombre}</p>
                    <button onClick={() => quitarDelCarrito(i.productoId)} className="text-danger/70 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="border border-ink/15 rounded px-2 py-1 w-24 text-sm"
                      value={i.espesorCm}
                      onChange={(e) => actualizarEspesor(i.productoId, Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                    />
                    <span className="text-xs text-ink/50">cm</span>
                    <span className="ml-auto font-mono text-sm">
                      ${(i.precioPorCm * i.espesorCm).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <label className="block text-sm text-ink/60 mb-1">Cliente (opcional)</label>
            {clienteSeleccionado ? (
              <div className="border border-ink/15 rounded px-3 py-2 mb-1 flex items-center justify-between">
                <span className="text-sm">
                  {clienteSeleccionado.nombre} <span className="text-ink/40">({clienteSeleccionado.rut})</span>
                </span>
                <button onClick={quitarCliente} className="text-ink/40 hover:text-danger text-xs">
                  Quitar
                </button>
              </div>
            ) : (
              <div className="relative mb-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input
                  className="border border-ink/15 rounded pl-9 pr-3 py-2 w-full text-sm"
                  placeholder="Buscar cliente por nombre o RUT..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  onFocus={() => setBuscadorClienteAbierto(true)}
                  onBlur={() => setTimeout(() => setBuscadorClienteAbierto(false), 150)}
                />
                {buscadorClienteAbierto && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-ink/15 rounded shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.length === 0 && (
                      <p className="text-sm text-ink/40 px-3 py-2">Sin resultados</p>
                    )}
                    {clientesFiltrados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => seleccionarCliente(c.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5 flex items-center justify-between"
                      >
                        <span>
                          {c.nombre} <span className="text-ink/40">({c.rut})</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {clienteSeleccionado && (
              <div className="mb-4">
                <p className="text-base font-bold text-danger">
                  Crédito disponible: {pesos(creditoDisponible)}
                </p>
                <p className="text-xs text-ink/50 font-mono">
                  Límite {pesos(clienteSeleccionado.limiteCredito)} · Usado {pesos(clienteSeleccionado.creditoUsado)}
                </p>
                {estadoCredito?.vencida && (
                  <p className="text-base font-bold text-danger mt-1">
                    Deuda vencida: {pesos(estadoCredito.montoVencido)} (hace {estadoCredito.diasVencida}{' '}
                    {estadoCredito.diasVencida === 1 ? 'día' : 'días'})
                  </p>
                )}
                {estadoCredito && !estadoCredito.vencida && estadoCredito.proximoVencimiento && (
                  <p className="text-xs text-ink/50 mt-1">
                    Próximo vencimiento: {fechaLarga(estadoCredito.proximoVencimiento)}
                  </p>
                )}
              </div>
            )}
            {!clienteSeleccionado && <div className="mb-3" />}

            <label className="block text-sm text-ink/60 mb-1">Documento (opcional)</label>
            <div className="flex gap-2 mb-4">
              <select
                className="border border-ink/15 rounded px-2 py-2 text-sm w-40"
                value={tipoDocumento}
                onChange={(e) => {
                  const valor = e.target.value as '' | 'FACTURA' | 'NOTA_VENTA';
                  setTipoDocumento(valor);
                  if (!valor) setNumeroDocumento('');
                }}
              >
                <option value="">Sin documento</option>
                <option value="FACTURA">Factura</option>
                <option value="NOTA_VENTA">Nota de venta</option>
              </select>
              <input
                className="border border-ink/15 rounded px-3 py-2 text-sm flex-1 disabled:bg-ink/5"
                placeholder="N° de documento"
                maxLength={30}
                disabled={!tipoDocumento}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>

            <h3 className="text-sm font-medium text-ink/70 mb-2">Pagos</h3>
            {clienteConFactura && (
              <p className="text-xs text-amber-dark mb-2">Cliente con factura: todos los pagos llevan IVA.</p>
            )}
            <div className="space-y-2 mb-2">
              {pagos.map((p, idx) => {
                const sinConfirmar = p.borrador !== p.monto;
                return (
                  <div key={idx} className="border border-ink/10 rounded p-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <select
                        className="border border-ink/15 rounded px-2 py-1.5 text-sm flex-1 min-w-0"
                        value={p.medioPago}
                        onChange={(e) => cambiarMedioPago(idx, e.target.value as MedioPago)}
                      >
                        {Object.entries(etiquetasMedioPago).map(([valor, etiqueta]) => (
                          <option key={valor} value={valor}>{etiqueta}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border border-ink/15 rounded px-2 py-1.5 text-sm w-32"
                        placeholder="Monto neto"
                        value={p.borrador}
                        onChange={(e) => escribirMonto(idx, e.target.value)}
                        onBlur={() => confirmarMonto(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                      />
                      {pagos.length > 1 && (
                        <button onClick={() => quitarPago(idx)} className="text-danger/70 hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-ink/60 cursor-pointer pl-1">
                      <input
                        type="checkbox"
                        checked={conIvaEn(p)}
                        disabled={clienteConFactura}
                        onChange={(e) => cambiarIva(idx, e.target.checked)}
                      />
                      {clienteConFactura ? 'Incluye IVA (cliente con factura)' : 'Incluye IVA (19%)'}
                    </label>

                    {sinConfirmar ? (
                      <p className="mt-2 text-xs text-ink/40 pl-1">
                        Presiona Tab o haz clic fuera del campo para calcular.
                      </p>
                    ) : (
                      montoNeto(p) > 0 && (
                        <div className="mt-2 pt-2 border-t border-ink/10 flex items-end justify-between">
                          {conIvaEn(p) ? (
                            <>
                              <div>
                                <p className="text-xs text-ink/50">IVA (19%)</p>
                                <p className="text-lg font-bold font-mono text-amber-dark">{pesos(ivaDe(p))}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-ink/50">Cobrar con IVA</p>
                                <p className="text-xl font-bold font-mono text-ink">{pesos(cobrarDe(p))}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-ink/50">Cobrar (sin IVA)</p>
                              <p className="text-lg font-bold font-mono text-ink">{pesos(cobrarDe(p))}</p>
                            </>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={agregarPago}
              className="text-sm text-amber-dark hover:underline self-start mb-4"
            >
              + Agregar otro medio de pago
            </button>

            {montoQueAfectaCredito > 0 && clienteSeleccionado && (
              <div className="border border-ink/10 rounded p-3 mb-3">
                <label className="block text-sm font-medium text-ink/70 mb-1">Vencimiento del crédito</label>
                <input
                  type="date"
                  className="border border-ink/15 rounded px-3 py-2 text-sm w-full"
                  min={hoyLocal()}
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
                {fechaVencimiento ? (
                  <p className="text-sm font-bold text-ink mt-2 capitalize">{fechaLarga(fechaVencimiento)}</p>
                ) : (
                  <p className="text-xs text-danger mt-1">
                    Este cliente no tiene días de crédito definidos: elige la fecha.
                  </p>
                )}
                <p className="text-xs text-ink/40 mt-1">
                  {clienteSeleccionado.diasCredito > 0 ? `Plazo del cliente: ${clienteSeleccionado.diasCredito} días. ` : ''}
                  Si no ha pagado, desde el día siguiente no se le venderá a crédito.
                </p>
              </div>
            )}

            <div className="border-t border-ink/10 pt-3 mb-2 space-y-1">
              <div className="flex justify-between text-sm text-ink/60">
                <span>Subtotal (neto)</span>
                <span className="font-mono">{pesos(subtotal)}</span>
              </div>
              {ivaTotal > 0 && (
                <div className="flex justify-between items-center text-ink">
                  <span className="text-sm">IVA (19%)</span>
                  <span className="font-mono text-lg font-bold text-amber-dark">{pesos(ivaTotal)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-ink">
                <span className="text-sm font-medium">Total a cobrar</span>
                <span className="font-mono text-xl font-bold">{pesos(totalConIva)}</span>
              </div>
              <div
                className={`flex justify-between text-sm font-medium pt-1 ${
                  restante > 0.5 ? 'text-amber-dark' : restante < -0.5 ? 'text-danger' : 'text-teal'
                }`}
              >
                <span>
                  {restante > 0.5 ? 'Quedará pendiente (neto)' : restante < -0.5 ? 'Sobra (no permitido)' : 'Cubierto (neto)'}
                </span>
                <span className="font-mono">{pesos(Math.abs(restante))}</span>
              </div>
            </div>

            {bloqueadoPorVencida && clienteSeleccionado && estadoCredito && (
              <div className="border border-danger/30 bg-danger/5 text-danger text-sm rounded p-3 mb-3">
                <p className="font-medium">No se puede hacer la venta a crédito</p>
                <p>{clienteSeleccionado.nombre} tiene deuda vencida.</p>
                <p className="text-xs mt-1 font-mono">
                  Vencido {pesos(estadoCredito.montoVencido)} · hace {estadoCredito.diasVencida}{' '}
                  {estadoCredito.diasVencida === 1 ? 'día' : 'días'}
                </p>
                <p className="text-xs mt-1">
                  Debe pagarla antes de comprar a crédito. Si paga esta venta completa, sí se puede realizar.
                </p>
              </div>
            )}

            {estadoCredito?.vencida && !bloqueadoPorVencida && (
              <p className="text-xs text-amber-dark mb-3">
                Este cliente tiene deuda vencida, pero esta venta no le suma deuda, por eso se puede realizar.
              </p>
            )}

            {superaLimiteCredito && clienteSeleccionado && (
              <div className="border border-danger/30 bg-danger/5 text-danger text-sm rounded p-3 mb-3">
                <p className="font-medium">No se puede hacer la venta</p>
                <p>{clienteSeleccionado.nombre} está en su límite de crédito.</p>
                <p className="text-xs mt-1 font-mono">
                  Disponible {pesos(Math.max(0, creditoDisponible))} · Esta venta necesita {pesos(montoQueAfectaCredito)}
                </p>
                <p className="text-xs mt-1">Baja el monto a crédito o págalo con otro medio.</p>
              </div>
            )}

            {error && <p className="text-danger text-sm mb-3">{error}</p>}

            <button
              onClick={finalizarVenta}
              disabled={guardando || superaLimiteCredito || bloqueadoPorVencida}
              className="bg-amber text-graphite font-medium px-4 py-2.5 rounded hover:bg-amber-dark transition disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Finalizar venta'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}