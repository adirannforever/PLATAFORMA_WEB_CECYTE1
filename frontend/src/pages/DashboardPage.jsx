// src/pages/DashboardPage.jsx
// Página de inicio — muestra un resumen según el rol del usuario

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { comunicadosService, calificacionesService, materiasService, usuariosService } from '../services/api';
import styles from './DashboardPage.module.css';

const SALUDO = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const [comunicados, setComunicados] = useState([]);
  const [stats, setStats] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const comRes = await comunicadosService.getAll();
        setComunicados(comRes.data.comunicados.slice(0, 3));

        // Stats según rol
        if (usuario.rol === 'administrador') {
          const [alumnos, docentes, materias] = await Promise.all([
            usuariosService.getAll('alumno'),
            usuariosService.getAll('docente'),
            materiasService.getAll(),
          ]);
          setStats({
            alumnos: alumnos.data.usuarios.length,
            docentes: docentes.data.usuarios.length,
            materias: materias.data.materias.length,
            comunicados: comRes.data.comunicados.length,
          });
        } else if (usuario.rol === 'docente') {
          const materias = await materiasService.getAll();
          setStats({ materias: materias.data.materias.length });
        } else {
          const califs = await calificacionesService.misCalificaciones();
          setStats({ calificaciones: califs.data.calificaciones.length });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [usuario.rol]);

  if (cargando) return <div className={styles.loading}>Cargando...</div>;

  return (
    <div className={styles.page}>
      {/* Encabezado de bienvenida */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeTitle}>
            {SALUDO()}, {usuario.nombre}
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

      {/* Tarjetas de estadísticas — según rol */}
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
            {comunicados.map((c) => (
              <div key={c.id} className={styles.comunicadoCard}>
                <div className={styles.comunicadoDot} />
                <div className={styles.comunicadoBody}>
                  <h3 className={styles.comunicadoTitulo}>{c.titulo}</h3>
                  <p className={styles.comunicadoContenido}>
                    {c.contenido.length > 120 ? c.contenido.slice(0, 120) + '...' : c.contenido}
                  </p>
                  <span className={styles.comunicadoMeta}>
                    {new Date(c.fecha_publicacion).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })} · {c.autor_nombre} {c.autor_apellidos}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, to, color }) {
  const colorMap = {
    green: { bg: 'var(--color-primary-muted)', accent: 'var(--color-primary)' },
    blue:  { bg: 'var(--color-info-light)',    accent: 'var(--color-info)' },
    gold:  { bg: 'var(--color-accent-light)',  accent: 'var(--color-accent)' },
    gray:  { bg: 'var(--color-gray-100)',       accent: 'var(--color-gray-600)' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Link to={to} className={styles.statCard} style={{ '--card-bg': c.bg, '--card-accent': c.accent }}>
      <span className={styles.statValue}>{value ?? '—'}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  );
}
