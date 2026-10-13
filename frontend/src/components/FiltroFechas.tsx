interface Props {
  desde: string;
  hasta: string;
  onCambio: (desde: string, hasta: string) => void;
}

// Fecha local en formato YYYY-MM-DD (lo que entiende el input type="date")
const formatoFecha = (d: Date) => d.toLocaleDateString('en-CA');

const hoy = () => formatoFecha(new Date());

const haceDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return formatoFecha(d);
};

const inicioDeMes = () => {
  const d = new Date();
  return formatoFecha(new Date(d.getFullYear(), d.getMonth(), 1));
};

const inicioMesAnterior = () => {
  const d = new Date();
  return formatoFecha(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};

const finMesAnterior = () => {
  const d = new Date();
  // Día 0 del mes actual = último día del mes anterior
  return formatoFecha(new Date(d.getFullYear(), d.getMonth(), 0));
};

export const rangoPorDefecto = () => ({ desde: inicioDeMes(), hasta: hoy() });

export default function FiltroFechas({ desde, hasta, onCambio }: Props) {
  const atajos = [
    { etiqueta: 'Hoy', desde: hoy(), hasta: hoy() },
    { etiqueta: 'Últimos 7 días', desde: haceDias(6), hasta: hoy() },
    { etiqueta: 'Este mes', desde: inicioDeMes(), hasta: hoy() },
    { etiqueta: 'Mes anterior', desde: inicioMesAnterior(), hasta: finMesAnterior() },
  ];

  return (
    <div className="bg-white border border-ink/10 rounded p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-ink/50 mb-1">Desde</label>
          <input
            type="date"
            className="border border-ink/15 rounded px-3 py-2 text-sm"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => onCambio(e.target.value, hasta)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Hasta</label>
          <input
            type="date"
            className="border border-ink/15 rounded px-3 py-2 text-sm"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => onCambio(desde, e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <span className="text-xs text-ink/40">Atajos:</span>
          {atajos.map((a) => (
            <button
              key={a.etiqueta}
              onClick={() => onCambio(a.desde, a.hasta)}
              className="text-xs px-2.5 py-1 rounded border border-ink/15 text-ink/60 hover:bg-ink/5"
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}