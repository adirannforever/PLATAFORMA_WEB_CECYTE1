import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMenuItems, categoryOrder, CATEGORIES } from '../../config/menuItems';
import { usePermissions } from '../../hooks/usePermissions';
import styles from './DashboardLayout.module.css';
import logoCecyte from '../../assets/logo_cecyte.png';
import { ChevronDown, ChevronRight, Home, AlertCircle } from 'lucide-react';

const IconPortal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const LogoCECyTE = () => (
  <img src={logoCecyte} alt="Logo CECyTE" style={{ width: '68px', height: '68px', objectFit: 'cover' }} />
);

const ETIQUETA_ROL = {
  administrador: 'Administrador',
  docente: 'Docente',
  alumno: 'Alumno',
};

// Mapeo de rutas a nombres para breadcrumbs
const ROUTE_NAMES = {
  '/dashboard': 'Inicio',
  '/comunicados': 'Comunicados',
  '/reportes': 'Reportes',
  '/horarios': 'Horarios',
  '/grupos': 'Grupos',
  '/asistencia': 'Asistencias',
  '/calificaciones': 'Calificaciones',
  '/mis-calificaciones': 'Mis Calificaciones',
  '/inscripciones': 'Inscripciones',
  '/incidencias': 'Incidencias',
  '/usuarios': 'Usuarios',
  '/becas': 'Becas',
  '/pagos': 'Pagos',
  '/titulacion': 'Titulación',
  '/servicio-social': 'Servicio Social',
  '/expediente': 'Expediente',
  '/configuracion-academica': 'Configuración Académica',
  // Nuevas rutas para Mis Clases (docente)
  '/mis-clases': 'Mis Clases',
  '/mis-clases/grupo': 'Grupo',
  '/mis-clases/grupo/materias': 'Materias',
  '/mis-clases/grupo/asistencias': 'Asistencias',
  '/mis-clases/grupo/calificaciones': 'Calificaciones',
  '/mis-clases/grupo/incidencias': 'Incidencias',
  '/mis-clases/materia': 'Calificaciones',
};

export default function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const groupedItems = getMenuItems(usuario?.rol);
  const categoriesWithItems = categoryOrder.filter((cat) => groupedItems[cat]?.length > 0);

  const badgeCounts = useMemo(() => {
    return {};
  }, [usuario]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    const crumbs = [];
    let currentPath = '';
    parts.forEach((part) => {
      currentPath += `/${part}`;
      const label = ROUTE_NAMES[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
      crumbs.push({ path: currentPath, label });
    });
    return crumbs;
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error al cerrar sesión', err);
    }
  };

  const toggleSection = (catKey) => {
    setCollapsedSections((prev) => {
      const newState = { ...prev, [catKey]: !prev[catKey] };
      localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <div className={styles.shell}>
      {sidebarAbierto && <div className={styles.overlay} onClick={() => setSidebarAbierto(false)} />}

      <aside className={`${styles.sidebar} ${sidebarAbierto ? styles.sidebarOpen : ''}`} role="navigation" aria-label="Menú principal">
        <div className={styles.brand}>
          <LogoCECyTE />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>CECyTE</span>
            <span className={styles.brandSub}>Plantel 1</span>
          </div>
        </div>

        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {usuario?.nombre?.charAt(0)}
            {usuario?.apellidos?.charAt(0)}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{usuario?.nombre} {usuario?.apellidos}</span>
            <span className={styles.userRole}>{ETIQUETA_ROL[usuario?.rol]}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {categoriesWithItems.map((catKey) => {
            const items = groupedItems[catKey];
            const category = CATEGORIES[catKey];
            if (!category || items.length === 0) return null;
            const isCollapsed = collapsedSections[catKey] || false;
            const sectionId = `nav-section-${catKey}`;
            const labelId = `${sectionId}-label`;

            return (
              <div key={catKey} className={styles.navSection} role="group" aria-labelledby={labelId}>
                <button
                  className={styles.navSectionToggle}
                  onClick={() => toggleSection(catKey)}
                  aria-expanded={!isCollapsed}
                  aria-controls={sectionId}
                  id={labelId}
                >
                  <span className={styles.navSectionLabel}>{category.label}</span>
                  <span className={styles.navSectionArrow}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>
                <div
                  id={sectionId}
                  className={`${styles.navSectionItems} ${isCollapsed ? styles.navSectionCollapsed : ''}`}
                  role="list"
                >
                  {items.map((item) => {
                    let badge = null;
                    if (item.badge === 'notificaciones' && badgeCounts.incidencias) {
                      badge = <span className={styles.navBadge}>{badgeCounts.incidencias}</span>;
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                        }
                        onClick={() => setSidebarAbierto(false)}
                        aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
                      >
                        <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                        {item.label}
                        {badge}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/" className={styles.navItemPortal} onClick={() => setSidebarAbierto(false)}>
            <span className={styles.navIcon} aria-hidden="true"><IconPortal /></span>
            Volver al Portal
          </NavLink>

          <button className={styles.logoutBtn} onClick={() => setShowLogoutConfirm(true)}>
            <span className={styles.navIcon} aria-hidden="true"><IconLogout /></span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            aria-label="Abrir menú de navegación"
          >
            <IconMenu />
          </button>
          <div className={styles.headerBrand}>
            <LogoCECyTE />
            <span className={styles.headerTitle}>CECyTE Plantel 1</span>
          </div>
          <div className={styles.headerUser}>
            <span>{usuario?.nombre}</span>
            <div className={styles.avatarSmall}>{usuario?.nombre?.charAt(0)}</div>
          </div>
        </header>

        <div className={styles.breadcrumbs} aria-label="Ruta de navegación">
          <Home size={14} className={styles.breadcrumbIcon} />
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={crumb.path} className={styles.breadcrumbItem}>
                {!isLast ? (
                  <NavLink to={crumb.path} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </NavLink>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                )}
                {!isLast && <span className={styles.breadcrumbSeparator}>/</span>}
              </span>
            );
          })}
        </div>

        <main className={styles.content} id="main-content">
          <Outlet />
        </main>
      </div>

      {showLogoutConfirm && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className={styles.confirmBox}>
            <h3 id="confirm-title" style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px' }}>¿Cerrar sesión?</h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
              ¿Estás seguro de que deseas salir de la plataforma académica?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className={styles.confirmCancel}>
                Cancelar
              </button>
              <button type="button" onClick={handleLogout} className={styles.confirmLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}