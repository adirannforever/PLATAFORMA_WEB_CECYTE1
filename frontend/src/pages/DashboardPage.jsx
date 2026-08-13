import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { comunicadosService, calificacionesService, catalogosService, gruposService, materiasService } from '../services/api';
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
        const [alumnosRes, docentesRes, materiasRes, gruposRes] = await Promise.all([
          catalogosService.getAlumnos(),
          catalogosService.getDocentes(),
          catalogosService.getMaterias(),
          catalogosService.getGrupos(),
        ]);
        setStats({
          alumnos: alumnosRes?.data?.length ?? 0,
          docentes: docentesRes?.data?.length ?? 0,
          materias: materiasRes?.data?.length ?? 0,
          grupos: gruposRes?.data?.length ?? 0,
          comunicados: listaComunicados.length,
        });
      } else if (usuario.rol === 'docente') {
        // CORREGIDO: usar materiasService con filtro docente_id
        const materiasRes = await materiasService.getAll({ docente_id: usuario.id });
        const materias = materiasRes?.data || [];
        setStats({
          materias: materias.length,
          grupos: new Set(materias.map(m => m.grupo_id)).size,
        });
      } else if (usuario.rol === 'alumno') {
        const califsRes = await calificacionesService.misCalificaciones();
        const calificaciones = califsRes?.calificaciones || [];
        setStats({
          calificaciones: calificaciones.length,
          materias: calificaciones.length,
        });
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
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [usuario?.rol, location.pathname]);

  if (!usuario) return <div className={styles.loading}>Verificando sesión...</div>;
  if (cargando) return <div className={styles.skeletonLoading}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeTitle}>{SALUDO()}, {usuario.nombre || 'Usuario'}</h1>
          <p className={styles.welcomeDesc}>Bienvenido a la plataforma académica del CECyTE Plantel 1.</p>
        </div>
        <div className={styles.welcomeBadge}>
          {usuario.rol === 'administrador' && 'Administrador'}
          {usuario.rol === 'docente' && 'Docente'}
          {usuario.rol === 'alumno' && 'Alumno'}
        </div>
      </div>

      {usuario.rol === 'administrador' && (
        <div className={styles.statsGrid}>
          <StatCard label="Alumnos registrados" value={stats.alumnos} to="/usuarios" color="green" />
          <StatCard label="Docentes activos" value={stats.docentes} to="/usuarios" color="blue" />
          <StatCard label="Materias" value={stats.materias} to="/configuracion-academica" color="gold" />
          <StatCard label="Grupos" value={stats.grupos} to="/grupos" color="gray" />
          <StatCard label="Comunicados" value={stats.comunicados} to="/comunicados" color="purple" />
        </div>
      )}

      {usuario.rol === 'docente' && (
        <div className={styles.statsGrid}>
          <StatCard label="Materias asignadas" value={stats.materias} to="/calificaciones" color="green" />
          <StatCard label="Grupos asignados" value={stats.grupos} to="/grupos" color="blue" />
        </div>
      )}

      {usuario.rol === 'alumno' && (
        <div className={styles.statsGrid}>
          <StatCard label="Materias cursando" value={stats.materias} to="/mis-calificaciones" color="green" />
          <StatCard label="Calificaciones registradas" value={stats.calificaciones} to="/mis-calificaciones" color="blue" />
          <StatCard label="Mi Expediente" value="Ver" to={`/expediente/${usuario.id}`} color="gold" />
        </div>
      )}

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
                      {!isNaN(fechaSegura) ? fechaSegura.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha no disponible'} · {c.autor_nombre || ''} {c.autor_apellidos || ''}
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
    blue: { bg: 'var(--color-info-light)', accent: 'var(--color-info)' },
    gold: { bg: 'var(--color-accent-light)', accent: 'var(--color-accent)' },
    gray: { bg: 'var(--color-gray-100)', accent: 'var(--color-gray-600)' },
    purple: { bg: 'var(--color-purple-light)', accent: 'var(--color-purple)' },
  };
  const c = colorMap[color] || colorMap.green;
  return (
    <Link to={to} className={styles.statCard} style={{ '--card-bg': c.bg, '--card-accent': c.accent }}>
      <span className={styles.statValue}>{value ?? '0'}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  );
}