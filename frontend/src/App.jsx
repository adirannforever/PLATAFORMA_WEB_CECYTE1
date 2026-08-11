import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import DashboardLayout from './components/layout/DashboardLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComunicadosPage from './pages/ComunicadosPage';
import CalificacionesPage from './pages/CalificacionesPage';
import GruposPage from './pages/GruposPage';
import UsuariosPage from './pages/UsuariosPage';
import InscripcionesPage from './pages/InscripcionesPage';
import AsistenciaPage from './pages/AsistenciaPage'; 
import NotFoundPage from './pages/NotFoundPage';
import ExpedientePage from './pages/ExpedientePage';
import BecasPage from './pages/BecasPage';
import BecasDetallePage from './pages/BecasDetallePage';
import PagosPage from './pages/PagosPage';
import ServicioSocialPage from './pages/ServicioSocialPage';
import TitulacionPage from './pages/TitulacionPage';
import ConfiguracionAcademicaPage from './pages/ConfiguracionAcademicaPage';
import IncidenciasPage from './pages/IncidenciasPage';

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
      <Route path="/login" element={usuario ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* RUTAS PROTEGIDAS CON LAYOUT */}
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

        {/* Grupos */}
        <Route path="/grupos" element={<GruposPage />} />

        {/* Docente y Admin */}
        <Route
          path="/materias"
          element={
            <RutaProtegida rolesPermitidos={['docente', 'administrador']}>
              <GruposPage /> {/* O la página que tengas para materias, pero ya tienes Grupos */}
            </RutaProtegida>
          }
        />
        <Route
          path="/calificaciones/:materia_grupo_id"
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

        {/*  NUEVA RUTA: ASISTENCIAS */}
        <Route
          path="/asistencia"
          element={
            <RutaProtegida rolesPermitidos={['administrador', 'docente']}>
              <AsistenciaPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/expediente"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <ExpedientePage />
            </RutaProtegida>
          }
        />
        <Route
          path="/expediente/:id"
          element={
            <RutaProtegida rolesPermitidos={['administrador', 'alumno']}>
              <ExpedientePage />
            </RutaProtegida>
          }
        />

        <Route 
          path="becas" 
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <BecasPage />
            </RutaProtegida>
          } 
        />

        <Route 
          path="becas/detalle/:nombre_beca" 
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <BecasDetallePage />
            </RutaProtegida>
          }
        />
        <Route 
          path="pagos"  
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <PagosPage />
            </RutaProtegida>
            } 
          />
        <Route 
          path="servicio-social" 
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <ServicioSocialPage />
            </RutaProtegida>
            } 
        />
        <Route 
          path="titulacion" 
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <TitulacionPage />
            </RutaProtegida>
            } 
        />

        <Route 
          path="/configuracion-academica" 
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <ConfiguracionAcademicaPage />
            </RutaProtegida>
          } 
        />
        <Route
          path="/incidencias"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <IncidenciasPage />
            </RutaProtegida>
          }
        />          
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}