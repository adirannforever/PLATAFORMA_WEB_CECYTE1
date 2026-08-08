import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import { comunicadosService, calificacionesService, catalogosService } from '../services/api';
import styles from './DashboardPage.module.css';

const SALUDO = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const location = useLocation(); 
  const [comunicados, setComunicados] = useState([]);
  const [stats, setStats] = useState({});
  const [cargando, setCargando] = useState(true);

  
  const cargar = async () => {
    if (!usuario?.rol) return;
    
    try {
      const comRes = await comunicadosService.getAll();
      const listaComunicados = comRes?.data || [];
      setComunicados(listaComunicados.slice(0, 3));

      if (usuario.rol === 'administrador') {
        const [alumnos, docentes, materias] = await Promise.all([
          catalogosService.getAlumnos(),
          catalogosService.getDocentes(),
          catalogosService.getMaterias(),
        ]);
        setStats({
          alumnos: alumnos?.data?.length ?? 0,
          docentes: docentes?.data?.length ?? 0,
          materias: materias?.data?.length ?? 0,
          comunicados: listaComunicados.length,
        });
      } else if (usuario.rol === 'docente') {
        const materias = await catalogosService.getMaterias();
        setStats({ materias: materias?.data?.length ?? 0 });
      } else if (usuario.rol === 'alumno') {
        const califs = await calificacionesService.misCalificaciones();
        setStats({ calificaciones: califs?.data?.calificaciones?.length ?? 0 });
      }
    } catch (err) {
      console.error('Error al cargar datos del Dashboard:', err);
    } finally {
      setCargando(false);
    }
  };

  
  useEffect(() => {
    cargar();

    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cargar();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [usuario?.rol, location.pathname]); 

  
  

  
  if (!usuario) {
    return <div className={styles.loading}>Verificando sesión...</div>;
  }

  
  if (cargando) {
    return (
      <div className={styles.page}>
        <div className={styles.welcome}>
          <div style={{ width: '100%' }}>
            <div className={styles.skeletonTitle} style={{ width: '300px', height: '32px', marginBottom: '8px', background: '#e5e7eb', borderRadius: '6px' }} />
            <div className={styles.skeletonDesc} style={{ width: '450px', height: '18px', background: '#e5e7eb', borderRadius: '4px' }} />
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.skeletonStatCard} style={{ height: '100px', background: '#e5e7eb', borderRadius: '12px' }} />
          <div className={styles.skeletonStatCard} style={{ height: '100px', background: '#e5e7eb', borderRadius: '12px' }} />
          <div className={styles.skeletonStatCard} style={{ height: '100px', background: '#e5e7eb', borderRadius: '12px' }} />
          <div className={styles.skeletonStatCard} style={{ height: '100px', background: '#e5e7eb', borderRadius: '12px' }} />
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div style={{ width: '200px', height: '24px', background: '#e5e7eb', borderRadius: '4px' }} />
            <div style={{ width: '80px', height: '18px', background: '#e5e7eb', borderRadius: '4px' }} />
          </div>

          <div className={styles.comunicadosList}>
            <div className={styles.skeletonCard} style={{ height: '90px', background: '#e5e7eb', borderRadius: '10px', marginBottom: '1rem' }} />
            <div className={styles.skeletonCard} style={{ height: '90px', background: '#e5e7eb', borderRadius: '10px', marginBottom: '1rem' }} />
            <div className={styles.skeletonCard} style={{ height: '90px', background: '#e5e7eb', borderRadius: '10px' }} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Encabezado de bienvenida */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeTitle}>
            {SALUDO()}, {usuario.nombre || 'Usuario'}
          </h1>
          <p className={styles.welcomeDesc}>
            Bienvenido a la plataforma académica del CECyTE Plantel 1.
          </p>
        </div>
        <div className={styles.welcomeBadge}>
          {usuario.rol === 'administrador' && 'Administrador'}
          {usuario.rol === 'docente' && 'Docente'}
          {usuario.rol === 'alumno' && 'Alumno'}
        </div>
      </div>

      {/* Tarjetas de estadísticas y accesos directos — según rol */}
      {usuario.rol === 'administrador' && (
        <div className={styles.statsGrid}>
          <StatCard label="Alumnos registrados" value={stats.alumnos} to="/usuarios" color="green" />
          <StatCard label="Docentes activos" value={stats.docentes} to="/usuarios" color="blue" />
          <StatCard label="Materias" value={stats.materias} to="/materias" color="gold" />
          <StatCard label="Comunicados" value={stats.comunicados} to="/comunicados" color="gray" />
        </div>
      )}

      {usuario.rol === 'docente' && (
        <div className={styles.statsGrid}>
          <StatCard label="MATERIAS ASIGNADAS" value={stats.materias} to="/materias" color="green" />
        </div>
      )}

      {usuario.rol === 'alumno' && (
        <div className={styles.statsGrid}>
          <StatCard label="CALIFICACIONES REGISTRADAS" value={stats.calificaciones} to="/mis-calificaciones" color="green" />
          {/* Acceso directo al expediente personal del alumno usando su id */}
          <StatCard label="MI EXPEDIENTE ESCOLAR" value="Ver" to={`/expediente/${usuario.id}`} color="blue" />
        </div>
      )}

      {/* Comunicados recientes */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Comunicados recientes</h2>
          <Link to="/comunicados" className={styles.verTodos}>Ver todos →</Link>
        </div>

        {comunicados.length === 0 ? (
          <div className={styles.empty}>No hay comunicados publicados aún.</div>
        ) : (
          <div className={styles.comunicadosList}>
            {comunicados.map((c) => {
              const textoContenido = c?.contenido || '';
              const fechaSegura = c?.fecha_publicacion ? new Date(c.fecha_publicacion) : new Date();

              return (
                <div key={c.id || Math.random()} className={styles.comunicadoCard}>
                  <div className={styles.comunicadoDot} />
                  <div className={styles.comunicadoBody}>
                    <h3 className={styles.comunicadoTitulo}>{c.titulo || 'Sin título'}</h3>
                    <p className={styles.comunicadoContenido}>
                      {textoContenido.length > 120 ? textoContenido.slice(0, 120) + '...' : textoContenido}
                    </p>
                    <span className={styles.comunicadoMeta}>
                      {!isNaN(fechaSegura) 
                        ? fechaSegura.toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })
                        : 'Fecha no disponible'}{' '}
                      · {c.autor_nombre || ''} {c.autor_apellidos || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, to, color }) {
  const colorMap = {
    green: { bg: 'var(--color-primary-muted)', accent: 'var(--color-primary)' },
    blue:  { bg: 'var(--color-info-light)',     accent: 'var(--color-info)' },
    gold:  { bg: 'var(--color-accent-light)',   accent: 'var(--color-accent)' },
    gray:  { bg: 'var(--color-gray-100)',       accent: 'var(--color-gray-600)' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Link to={to} className={styles.statCard} style={{ '--card-bg': c.bg, '--card-accent': c.accent }}>
      <span className={styles.statValue}>{value ?? '0'}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  );
}