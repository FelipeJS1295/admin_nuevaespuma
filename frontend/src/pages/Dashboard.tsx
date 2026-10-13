import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Bodega } from '../types/bodega';
import type { Producto } from '../types/producto';
import type { Cliente } from '../types/cliente';
import type { Stock } from '../types/stock';
import { Warehouse, Package, Users, AlertTriangle, Boxes } from 'lucide-react';

export default function Dashboard() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const [b, p, c, s] = await Promise.all([
        api.get<Bodega[]>('/bodegas'),
        api.get<Producto[]>('/productos'),
        api.get<Cliente[]>('/clientes'),
        api.get<Stock[]>('/stock'),
      ]);
      setBodegas(b.data);
      setProductos(p.data);
      setClientes(c.data);
      setStock(s.data);
      setCargando(false);
    };
    cargar();
  }, []);

  const stockTotalCm = stock.reduce((acc, s) => acc + s.cantidad, 0);
  const stockNegativo = stock.filter((s) => s.cantidad < 0);
  const clientesAlLimite = clientes.filter((c) => c.limiteCredito - c.creditoUsado <= 0 && c.limiteCredito > 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-1">Inicio</h1>
      <p className="text-ink/50 mb-8">Resumen general del sistema</p>

      {cargando ? (
        <p className="text-ink/50">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-ink/10 rounded p-5">
              <div className="flex items-center gap-2 text-ink/50 text-sm mb-2">
                <Warehouse size={16} /> Bodegas activas
              </div>
              <p className="text-3xl font-mono font-semibold">{bodegas.filter((b) => b.activa).length}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <div className="flex items-center gap-2 text-ink/50 text-sm mb-2">
                <Package size={16} /> Productos activos
              </div>
              <p className="text-3xl font-mono font-semibold">{productos.filter((p) => p.activo).length}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <div className="flex items-center gap-2 text-ink/50 text-sm mb-2">
                <Users size={16} /> Clientes
              </div>
              <p className="text-3xl font-mono font-semibold">{clientes.filter((c) => c.activo).length}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-5">
              <div className="flex items-center gap-2 text-ink/50 text-sm mb-2">
                <Boxes size={16} /> Stock total (cm)
              </div>
              <p className="text-3xl font-mono font-semibold">{stockTotalCm.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {(stockNegativo.length > 0 || clientesAlLimite.length > 0) && (
            <div className="bg-white border border-ink/10 rounded p-5">
              <div className="flex items-center gap-2 text-ink font-medium mb-3">
                <AlertTriangle size={18} className="text-danger" />
                Alertas
              </div>
              <ul className="space-y-2 text-sm">
                {stockNegativo.map((s) => (
                  <li key={s.id} className="text-danger">
                    Stock negativo: {s.producto.nombre} en {s.bodega.nombre} ({s.cantidad} cm)
                  </li>
                ))}
                {clientesAlLimite.map((c) => (
                  <li key={c.id} className="text-danger">
                    Cliente al límite de crédito: {c.nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}