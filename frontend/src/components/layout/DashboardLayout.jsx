import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './DashboardLayout.module.css';
import logoCecyte from '../../assets/logo_cecyte.png';

const IconPortal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconComunicados = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconCalif = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
  </svg>
);
const IconGrupos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
const IconUsuarios = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconInscripciones = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

// Logo CECyTE en SVG — escudo simplificado con los colores institucionales
const LogoCECyTE = () => (
  <img 
    src={logoCecyte} 
    alt="Logo CECyTE" 
    style={{ 
      width: '68px', 
      height: '68px', 
      objectFit: 'cover',
    }} 
  />
);

const ETIQUETA_ROL = {
  administrador: 'Administrador',
  docente: 'Docente',
  alumno: 'Alumno',
};

export default function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  
  // ── ESTADOS CORREGIDOS ──
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try { 
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error al cerrar sesión', err);
    }
  };

  // Navegación según rol
  const navItems = [
    { to: '/dashboard', label: 'Inicio', icon: <IconDashboard />, roles: ['administrador', 'docente', 'alumno'] },
    { to: '/comunicados', label: 'Comunicados', icon: <IconComunicados />, roles: ['administrador', 'docente', 'alumno'] },
    { to: '/mis-calificaciones', label: 'Mis Calificaciones', icon: <IconCalif />, roles: ['alumno'] },
    { to: '/grupos', label: 'Grupos', icon: <IconGrupos />, roles: ['administrador', 'docente'] },
    { to: '/usuarios', label: 'Usuarios', icon: <IconUsuarios />, roles: ['administrador'] },
    { to: '/inscripciones', label: 'Inscripciones', icon: <IconInscripciones />, roles: ['administrador'] },
  ].filter(item => item.roles.includes(usuario?.rol));

  return (
    <div className={styles.shell}>
      {/* Overlay móvil */}
      {sidebarAbierto && (
        <div className={styles.overlay} onClick={() => setSidebarAbierto(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`${styles.sidebar} ${sidebarAbierto ? styles.sidebarOpen : ''}`}>
        {/* Marca institucional */}
        <div className={styles.brand}>
          <LogoCECyTE />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>CECyTE</span>
            <span className={styles.brandSub}>Plantel 1</span>
          </div>
        </div>

        {/* Perfil del usuario */}
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {usuario?.nombre?.charAt(0)}{usuario?.apellidos?.charAt(0)}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{usuario?.nombre} {usuario?.apellidos}</span>
            <span className={styles.userRole}>{ETIQUETA_ROL[usuario?.rol]}</span>
          </div>
        </div>

{/* Navegación */}
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Menú principal</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={() => setSidebarAbierto(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zona inferior del Sidebar */}
        <div className={styles.sidebarFooter}>
          <NavLink
            to="/"
            className={styles.navItem}
            onClick={() => setSidebarAbierto(false)}
          >
            <span className={styles.navIcon}><IconPortal /></span>
            Volver al Portal
          </NavLink>

          <button 
            className={styles.logoutBtn} 
            onClick={() => setShowLogoutConfirm(true)}
          >
            <span className={styles.navIcon}><IconLogout /></span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            aria-label="Abrir menú"
          >
            <IconMenu />
          </button>
          <div className={styles.headerBrand}>
            <LogoCECyTE />
            <span className={styles.headerTitle}>CECyTE Plantel 1</span>
          </div>
          <div className={styles.headerUser}>
            <span>{usuario?.nombre}</span>
            <div className={styles.avatarSmall}>
              {usuario?.nombre?.charAt(0)}
            </div>
          </div>
        </header>

        <main className={styles.content}>
             <Outlet />
           
        </main>
      </div>

      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            width: '320px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px' }}>¿Cerrar sesión?</h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
              ¿Estás seguro de que deseas salir de la plataforma académica?
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}