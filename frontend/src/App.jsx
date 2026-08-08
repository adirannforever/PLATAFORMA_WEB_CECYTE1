import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import DashboardLayout from './components/layout/DashboardLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComunicadosPage from './pages/ComunicadosPage';
import CalificacionesPage from './pages/CalificacionesPage';
import GruposPage from './pages/GruposPage'; //  Ya importado
import UsuariosPage from './pages/UsuariosPage';
import InscripcionesPage from './pages/InscripcionesPage';
import NotFoundPage from './pages/NotFoundPage';
import ExpedientePage from './pages/ExpedientePage';

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
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={usuario ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <RutaProtegida>
            <DashboardLayout />
          </RutaProtegida>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="comunicados" element={<ComunicadosPage />} />

        {/* Alumno */}
        <Route
          path="/mis-calificaciones"
          element={
            <RutaProtegida rolesPermitidos={['alumno']}>
              <CalificacionesPage />
            </RutaProtegida>
          }
        />

        {/* Grupos (reemplaza a Materias) */}
        <Route path="/grupos" element={<GruposPage />} />

        {/* Redirigir /materias a /grupos para compatibilidad */}
        <Route path="/materias" element={<Navigate to="/grupos" replace />} />

        {/* Docente y Admin - Calificaciones de materia específica */}
        <Route
          path="/calificaciones/:materiaId"
          element={
            <RutaProtegida rolesPermitidos={['docente', 'administrador']}>
              <CalificacionesPage />
            </RutaProtegida>
          }
        />

        {/* Solo Admin */}
        <Route
          path="/usuarios"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <UsuariosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/inscripciones"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <InscripcionesPage />
            </RutaProtegida>
          }
        />
      </Route>

      <Route
        path="/expediente/:id"
        element={
          <RutaProtegida rolesPermitidos={['administrador', 'alumno']}>
            <ExpedientePage />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}