import { useState } from 'react';
import { rangoPorDefecto } from '../components/FiltroFechas';
import InformeVentasTab from '../components/informes/InformeVentasTab';
import InformeCuentasPorCobrarTab from '../components/informes/InformeCuentasPorCobrarTab';
import InformeInventarioTab from '../components/informes/InformeInventarioTab';
import InformeProduccionTab from '../components/informes/InformeProduccionTab';
import InformeIngresosTab from '../components/informes/InformeIngresosTab';

type Pestana = 'ventas' | 'ingresos' | 'cuentas' | 'inventario' | 'produccion';

const pestanas: { id: Pestana; etiqueta: string }[] = [
  { id: 'ventas', etiqueta: 'Ventas' },
  { id: 'ingresos', etiqueta: 'Ingresos' },
  { id: 'cuentas', etiqueta: 'Cuentas por cobrar' },
  { id: 'inventario', etiqueta: 'Inventario' },
  { id: 'produccion', etiqueta: 'Producción' },
];

export default function Informes() {
  const [pestana, setPestana] = useState<Pestana>('ventas');
  const [{ desde, hasta }, setRango] = useState(rangoPorDefecto());

  const cambiarFechas = (nuevoDesde: string, nuevoHasta: string) => {
    setRango({ desde: nuevoDesde, hasta: nuevoHasta });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-1">Informes</h1>
      <p className="text-ink/50 mb-6">Resumen de ventas, deudas, inventario y producción</p>

      <div className="flex gap-1 mb-6 border-b border-ink/10">
        {pestanas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              pestana === p.id ? 'border-amber text-ink' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'ventas' && (
        <InformeVentasTab desde={desde} hasta={hasta} onCambioFechas={cambiarFechas} />
      )}
            {pestana === 'ingresos' && (
        <InformeIngresosTab desde={desde} hasta={hasta} onCambioFechas={cambiarFechas} />
      )}
      {pestana === 'cuentas' && <InformeCuentasPorCobrarTab />}
      {pestana === 'inventario' && (
        <InformeInventarioTab desde={desde} hasta={hasta} onCambioFechas={cambiarFechas} />
      )}
      {pestana === 'produccion' && (
        <InformeProduccionTab desde={desde} hasta={hasta} onCambioFechas={cambiarFechas} />
      )}
    </div>
  );
}