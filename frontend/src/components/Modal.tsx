import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: 'sm' | 'lg' | 'xl';
}

const anchos = {
  sm: 'max-w-md',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export default function Modal({ titulo, abierto, onCerrar, children, ancho = 'sm' }: ModalProps) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 bg-graphite/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded w-full ${anchos[ancho]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10 shrink-0">
          <h2 className="font-semibold text-ink">{titulo}</h2>
          <button onClick={onCerrar} className="text-ink/40 hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}