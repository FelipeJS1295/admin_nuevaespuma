export interface Stock {
  id: number;
  bodegaId: number;
  productoId: number;
  cantidad: number;
  bodega: {
    id: number;
    nombre: string;
  };
  producto: {
    id: number;
    sku: string;
    nombre: string;
    densidad: number;
    precio: number;
  };
}