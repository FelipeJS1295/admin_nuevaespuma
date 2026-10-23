import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './routes/RutaProtegida';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bodegas from './pages/Bodegas';
import Productos from './pages/Productos';
import Stock from './pages/Stock';
import Clientes from './pages/Clientes';
import Usuarios from './pages/Usuarios';
import Ventas from './pages/Ventas';
import ClienteDetalle from './pages/ClienteDetalle';
import Informes from './pages/Informes';
import Despacho from './pages/Despacho';
import Caja from './pages/Caja';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/bodegas" element={<Bodegas />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route
              path="/usuarios"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN']}>
                  <Usuarios />
                </RutaProtegida>
              }
            />
            <Route
              path="/ventas"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN', 'VENTAS']}>
                  <Ventas />
                </RutaProtegida>
              }
            />
            <Route
              path="/despacho"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN', 'DESPACHO']}>
                  <Despacho />
                </RutaProtegida>
              }
            />
            <Route
              path="/caja"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN']}>
                  <Caja />
                </RutaProtegida>
              }
            />
            <Route
              path="/informes"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN']}>
                  <Informes />
                </RutaProtegida>
              }
            />
            <Route
              path="/clientes/:id"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN_MASTER', 'ADMIN', 'VENTAS']}>
                  <ClienteDetalle />
                </RutaProtegida>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;