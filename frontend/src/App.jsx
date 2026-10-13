import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';

import CookieBanner from './components/CookieBanner';

import DashboardLayout from './components/layout/DashboardLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ActivarCuentaAspirantePage from './pages/ActivarCuentaAspirantePage';
import DashboardPage from './pages/DashboardPage';
import MiSolicitudAspirantePage from './pages/MiSolicitudAspirantePage';
import ComunicadosPage from './pages/ComunicadosPage';
import CalificacionesPage from './pages/CalificacionesPage';
import GruposPage from './pages/GruposPage';
import UsuariosPage from './pages/UsuariosPage';
import AspirantesPage from './pages/AspirantesPage';
import InscripcionesPage from './pages/InscripcionesPage';
import ReinscripcionPage from './pages/ReinscripcionPage';
import AsistenciaPage from './pages/AsistenciaPage';
import NotFoundPage from './pages/NotFoundPage';
import LegalPrivacidad from './pages/LegalPrivacidad';
import LegalTerminos from './pages/LegalTerminos';
import LegalCookies from './pages/LegalCookies';
import ExpedientePage from './pages/ExpedientePage';
import BecasPage from './pages/BecasPage';
import BecasDetallePage from './pages/BecasDetallePage';
import PagosPage from './pages/PagosPage';
import ServicioSocialPage from './pages/ServicioSocialPage';
import TitulacionPage from './pages/TitulacionPage';
import ConfiguracionAcademicaPage from './pages/ConfiguracionAcademicaPage';
import IncidenciasPage from './pages/IncidenciasPage';
import AuditoriaPage from './pages/AuditoriaPage';
import ReportesPage from './pages/ReportesPage';
import HorariosPage from './pages/HorariosPage';
import MisClasesPage from './pages/MisClasesPage';
import MisClasesDetallePage from './pages/MisClasesDetallePage';
import NetworkStatus from './components/NetworkStatus';

const RutaProtegida = ({ children, rolesPermitidos, permisos }) => {
  const { usuario, cargando } = useAuth();
  const { tieneAlguno } = usePermissions();

  if (cargando) return <div className="loading-screen">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  // Modelo nuevo (recomendado): acceso por permiso 'modulo.accion'.
  if (permisos && permisos.length > 0) {
    if (!tieneAlguno(...permisos)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // Modelo legacy: acceso por rol plano (se mantiene por compatibilidad).
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default function App() {
  const location = useLocation();
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-gray-50)',
          color: 'var(--color-primary)',
          fontSize: '1rem',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Verificando sesión...
      </div>
    );
  }

  return (
    <>
      <CookieBanner />
      <NetworkStatus/>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/activar-cuenta" element={<ActivarCuentaAspirantePage />} />
        <Route
          path="/login"
          element={usuario && !location.search.includes('force=1') ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/legal/privacidad" element={<LegalPrivacidad />} />
        <Route path="/legal/terminos" element={<LegalTerminos />} />
        <Route path="/legal/cookies" element={<LegalCookies />} />

        <Route
          element={
            <RutaProtegida>
              <DashboardLayout />
            </RutaProtegida>
          }
        >
          <Route
            path="dashboard"
            element={usuario?.rol === 'aspirante' ? <Navigate to="/mi-solicitud" replace /> : <DashboardPage />}
          />
          <Route
            path="mi-solicitud"
            element={
              <RutaProtegida permisos={['aspirantes.ver_propio']}>
                <MiSolicitudAspirantePage />
              </RutaProtegida>
            }
          />
          <Route path="comunicados" element={<ComunicadosPage />} />

          {/* ===== ALUMNO ===== */}
          <Route
            path="mis-calificaciones"
            element={
              <RutaProtegida permisos={['calificaciones.ver_mis_calificaciones']}>
                <CalificacionesPage />
              </RutaProtegida>
            }
          />

          {/* ===== DOCENTE ===== */}
          <Route
            path="mis-clases"
            element={
              <RutaProtegida permisos={['calificaciones.ver_mis_materias', 'asistencia.ver_mis_clases']}>
                <MisClasesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="mis-clases/grupo/:grupoId/*"
            element={
              <RutaProtegida permisos={['calificaciones.ver_mis_materias', 'asistencia.ver_mis_clases', 'incidencias.ver_mis_alumnos']}>
                <MisClasesDetallePage />
              </RutaProtegida>
            }
          />
          <Route
            path="mis-clases/materia/:materia_grupo_id"
            element={
              <RutaProtegida permisos={['calificaciones.ver_mis_materias']}>
                <CalificacionesPage />
              </RutaProtegida>
            }
          />

          {/* ===== ADMIN + DOCENTE (módulos tradicionales) ===== */}
          <Route
            path="grupos"
            element={
              <RutaProtegida permisos={['grupos.ver']}>
                <GruposPage />
              </RutaProtegida>
            }
          />
          <Route
            path="asistencia"
            element={
              <RutaProtegida permisos={['asistencia.ver', 'asistencia.ver_mis_clases', 'asistencia.ver_grupo']}>
                <AsistenciaPage />
              </RutaProtegida>
            }
          />
          <Route
            path="calificaciones"
            element={
              <RutaProtegida permisos={['calificaciones.ver', 'calificaciones.ver_todas', 'calificaciones.ver_mis_materias']}>
                <CalificacionesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="calificaciones/grupo/:grupo_id"
            element={
              <RutaProtegida permisos={['calificaciones.ver', 'calificaciones.ver_todas', 'calificaciones.ver_grupo']}>
                <CalificacionesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="calificaciones/materia/:materia_grupo_id"
            element={
              <RutaProtegida permisos={['calificaciones.ver', 'calificaciones.ver_todas', 'calificaciones.ver_mis_materias']}>
                <CalificacionesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="incidencias"
            element={
              <RutaProtegida permisos={['incidencias.ver', 'incidencias.ver_todas', 'incidencias.ver_mis_alumnos', 'incidencias.ver_grupo']}>
                <IncidenciasPage />
              </RutaProtegida>
            }
          />
          <Route
            path="horarios"
            element={
              <RutaProtegida permisos={['horarios.ver', 'horarios.ver_mi_horario', 'horarios.ver_grupo']}>
                <HorariosPage />
              </RutaProtegida>
            }
          />
          <Route
            path="reportes"
            element={
              <RutaProtegida permisos={['reportes.ver']}>
                <ReportesPage />
              </RutaProtegida>
            }
          />

          {/* ===== SOLO ADMIN ===== */}
          <Route
            path="usuarios"
            element={
              <RutaProtegida permisos={['usuarios.ver']}>
                <UsuariosPage />
              </RutaProtegida>
            }
          />
          <Route
            path="aspirantes"
            element={
              <RutaProtegida permisos={['aspirantes.ver']}>
                <AspirantesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="inscripciones"
            element={
              <RutaProtegida permisos={['inscripciones.crear']}>
                <InscripcionesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="reinscripcion"
            element={
              <RutaProtegida permisos={['inscripciones.reinscripcion_propia']}>
                <ReinscripcionPage />
              </RutaProtegida>
            }
          />
          <Route
            path="expediente"
            element={
              <RutaProtegida permisos={['expediente.ver_todos', 'expediente.ver_mi_expediente']}>
                <ExpedientePage />
              </RutaProtegida>
            }
          />
          <Route
            path="expediente/:id"
            element={
              <RutaProtegida permisos={['expediente.ver', 'expediente.ver_todos', 'expediente.ver_mi_expediente']}>
                <ExpedientePage />
              </RutaProtegida>
            }
          />
          <Route
            path="becas"
            element={
              <RutaProtegida permisos={['becas.ver']}>
                <BecasPage />
              </RutaProtegida>
            }
          />
          <Route
            path="becas/detalle/:nombre_beca"
            element={
              <RutaProtegida permisos={['becas.ver']}>
                <BecasDetallePage />
              </RutaProtegida>
            }
          />
          <Route
            path="pagos"
            element={
              <RutaProtegida permisos={['pagos.ver', 'pagos.ver_mis_pagos']}>
                <PagosPage />
              </RutaProtegida>
            }
          />
          <Route
            path="servicio-social"
            element={
              <RutaProtegida permisos={['servicio_social.ver']}>
                <ServicioSocialPage />
              </RutaProtegida>
            }
          />
          <Route
            path="titulacion"
            element={
              <RutaProtegida permisos={['titulacion.ver']}>
                <TitulacionPage />
              </RutaProtegida>
            }
          />
          <Route
            path="configuracion-academica"
            element={
              <RutaProtegida permisos={['config_academica.ver', 'config_academica.gestionar']}>
                <ConfiguracionAcademicaPage />
              </RutaProtegida>
            }
          />
          <Route
            path="auditoria"
            element={
              <RutaProtegida permisos={['auditoria.ver']}>
                <AuditoriaPage />
              </RutaProtegida>
            }
          />

          <Route
            path="materias"
            element={
              <RutaProtegida permisos={['grupos.ver', 'grupos.ver_mis_grupos']}>
                <GruposPage />
              </RutaProtegida>
            }
          />

          {/* ===== 404 ===== */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}