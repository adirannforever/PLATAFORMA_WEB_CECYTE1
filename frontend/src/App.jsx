import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { Suspense, lazy } from 'react';
import React from 'react';

import CookieBanner from './components/CookieBanner';
import Skeleton from './components/Skeleton';

import DashboardLayout from './components/layout/DashboardLayout';
import NetworkStatus from './components/NetworkStatus';

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ActivarCuentaAspirantePage = React.lazy(() => import('./pages/ActivarCuentaAspirantePage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const MiSolicitudAspirantePage = React.lazy(() => import('./pages/MiSolicitudAspirantePage'));
const ComunicadosPage = React.lazy(() => import('./pages/ComunicadosPage'));
const CalificacionesPage = React.lazy(() => import('./pages/CalificacionesPage'));
const GruposPage = React.lazy(() => import('./pages/GruposPage'));
const UsuariosPage = React.lazy(() => import('./pages/UsuariosPage'));
const AspirantesPage = React.lazy(() => import('./pages/AspirantesPage'));
const InscripcionesPage = React.lazy(() => import('./pages/InscripcionesPage'));
const ReinscripcionPage = React.lazy(() => import('./pages/ReinscripcionPage'));
const AsistenciaPage = React.lazy(() => import('./pages/AsistenciaPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const LegalPrivacidad = React.lazy(() => import('./pages/LegalPrivacidad'));
const LegalTerminos = React.lazy(() => import('./pages/LegalTerminos'));
const LegalCookies = React.lazy(() => import('./pages/LegalCookies'));
const ExpedientePage = React.lazy(() => import('./pages/ExpedientePage'));
const BecasPage = React.lazy(() => import('./pages/BecasPage'));
const BecasDetallePage = React.lazy(() => import('./pages/BecasDetallePage'));
const PagosPage = React.lazy(() => import('./pages/PagosPage'));
const ServicioSocialPage = React.lazy(() => import('./pages/ServicioSocialPage'));
const TitulacionPage = React.lazy(() => import('./pages/TitulacionPage'));
const ConfiguracionAcademicaPage = React.lazy(() => import('./pages/ConfiguracionAcademicaPage'));
const IncidenciasPage = React.lazy(() => import('./pages/IncidenciasPage'));
const AuditoriaPage = React.lazy(() => import('./pages/AuditoriaPage'));
const ReportesPage = React.lazy(() => import('./pages/ReportesPage'));
const HorariosPage = React.lazy(() => import('./pages/HorariosPage'));
const MisClasesPage = React.lazy(() => import('./pages/MisClasesPage'));
const MisClasesDetallePage = React.lazy(() => import('./pages/MisClasesDetallePage'));

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
      <Suspense fallback={<div className="loading-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-gray-50)' }}><Skeleton variant="text" width="200px" height="1.5rem" /><Skeleton variant="text" width="200px" height="1.5rem" /><Skeleton variant="text" width="200px" height="1.5rem" /></div>}>
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
      </Suspense>
    </>
  );
}