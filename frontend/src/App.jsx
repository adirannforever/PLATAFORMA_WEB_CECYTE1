// src/App.jsx
// Define todas las rutas de la aplicación y quién puede acceder a cada una.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComunicadosPage from './pages/ComunicadosPage';
import CalificacionesPage from './pages/CalificacionesPage';
import MateriasPage from './pages/MateriasPage';
import UsuariosPage from './pages/UsuariosPage';
import InscripcionesPage from './pages/InscripcionesPage';
import NotFoundPage from './pages/NotFoundPage';

// ── Ruta protegida ────────────────────────────────────────────
// Si no hay sesión → manda al login.
// Si hay sesión pero el rol no coincide → manda al dashboard.
const RutaProtegida = ({ children, rolesPermitidos }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="loading-screen">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--color-gray-50)',
        color: 'var(--color-primary)', fontSize: '1rem', fontFamily: 'var(--font-sans)'
      }}>
        Verificando sesión...
      </div>
    );
  }

  return (
    <Routes>
      {/* Ruta pública */}
      <Route
        path="/login"
        element={usuario ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Rutas protegidas dentro del layout del dashboard */}
      <Route
        path="/"
        element={
          <RutaProtegida>
            <DashboardLayout />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Todos los roles */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="comunicados" element={<ComunicadosPage />} />

        {/* Alumno */}
        <Route
          path="mis-calificaciones"
          element={
            <RutaProtegida rolesPermitidos={['alumno']}>
              <CalificacionesPage />
            </RutaProtegida>
          }
        />

        {/* Docente y Admin */}
        <Route
          path="materias"
          element={
            <RutaProtegida rolesPermitidos={['docente', 'administrador']}>
              <MateriasPage />
            </RutaProtegida>
          }
        />
        <Route
          path="calificaciones/:materiaId"
          element={
            <RutaProtegida rolesPermitidos={['docente', 'administrador']}>
              <CalificacionesPage />
            </RutaProtegida>
          }
        />

        {/* Solo Admin */}
        <Route
          path="usuarios"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <UsuariosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="inscripciones"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <InscripcionesPage />
            </RutaProtegida>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
