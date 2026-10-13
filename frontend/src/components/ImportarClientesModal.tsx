import { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import Modal from './Modal';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface FilaExcel {
  rut: string;
  nombre: string;
  limiteCredito: number;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onImportado: () => void;
}

export default function ImportarClientesModal({ abierto, onCerrar, onImportado }: Props) {
  const [filas, setFilas] = useState<FilaExcel[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [error, setError] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<number | null>(null);

  const procesarArchivo = (file: File) => {
    setError('');
    setResultado(null);
    setNombreArchivo(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filasCrudas: any[] = XLSX.utils.sheet_to_json(hoja);

        const filasProcesadas: FilaExcel[] = filasCrudas
          .map((f) => ({
            rut: String(f.rut ?? f.RUT ?? f.Rut ?? '').trim(),
            nombre: String(f.Nombre ?? f.nombre ?? '').trim(),
            limiteCredito: Number(f.Credito ?? f.credito ?? f.Crédito ?? 0),
          }))
          .filter((f) => f.rut && f.nombre);

        if (filasProcesadas.length === 0) {
          setError('No se encontraron filas válidas. Verifica que el Excel tenga columnas "rut", "Nombre" y "Credito".');
          return;
        }
        setFilas(filasProcesadas);
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un Excel válido (.xlsx).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  };

  const handleSeleccionar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const confirmarImportacion = async () => {
    setImportando(true);
    setError('');
    try {
      const res = await api.post('/clientes/importar', { clientes: filas });
      setResultado(res.data.importados);
      onImportado();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocurrió un error al importar.');
    } finally {
      setImportando(false);
    }
  };

  const cerrarYLimpiar = () => {
    setFilas([]);
    setNombreArchivo('');
    setError('');
    setResultado(null);
    onCerrar();
  };

  return (
    <Modal titulo="Importar clientes desde Excel" abierto={abierto} onCerrar={cerrarYLimpiar}>
      {resultado !== null ? (
        <div className="text-center py-4">
          <p className="text-teal font-medium mb-1">¡Importación completada!</p>
          <p className="text-sm text-ink/60 mb-4">Se importaron {resultado} clientes.</p>
          <button
            onClick={cerrarYLimpiar}
            className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <>
          {filas.length === 0 ? (
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-ink/20 rounded p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber transition"
            >
              <Upload size={28} className="text-ink/30 mb-2" />
              <p className="text-sm text-ink/60 mb-1">Arrastra tu archivo Excel aquí</p>
              <p className="text-xs text-ink/40">o haz clic para seleccionarlo (.xlsx)</p>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleSeleccionar} />
            </label>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-ink/70">
                <FileSpreadsheet size={16} />
                {nombreArchivo}
              </div>
              <div className="border border-ink/10 rounded p-3 mb-4 max-h-48 overflow-y-auto">
                {filas.slice(0, 8).map((f, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-ink/5 last:border-0">
                    <span>{f.nombre} <span className="text-ink/40">({f.rut})</span></span>
                    <span className="font-mono text-ink/60">${f.limiteCredito.toLocaleString('es-CL')}</span>
                  </div>
                ))}
                {filas.length > 8 && (
                  <p className="text-xs text-ink/40 pt-2 text-center">... y {filas.length - 8} más</p>
                )}
              </div>
              <p className="text-sm text-ink/60 mb-4">
                Se importarán <strong>{filas.length}</strong> clientes.
              </p>
            </div>
          )}

          {error && <p className="text-danger text-sm mb-3">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button onClick={cerrarYLimpiar} className="px-4 py-2 rounded text-ink/60 hover:bg-ink/5">
              Cancelar
            </button>
            {filas.length > 0 && (
              <button
                onClick={confirmarImportacion}
                disabled={importando}
                className="bg-amber text-graphite font-medium px-4 py-2 rounded hover:bg-amber-dark transition disabled:opacity-50"
              >
                {importando ? 'Importando...' : `Importar ${filas.length} clientes`}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}