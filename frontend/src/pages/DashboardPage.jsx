import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, Layers, Megaphone, UserPlus, AlertTriangle,
  CalendarCheck, ClipboardList, CalendarDays, ChevronRight, CheckCircle2, Inbox,
  RefreshCw, Clock, FileText, UserCheck, Sparkles, MessageSquarePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { comunicadosService, calificacionesService, materiasService, dashboardService } from '../services/api';
import { INSTITUCION } from '../config/institucion';
import { relativeDate, longDate } from '../utils/format';
import { Card, StatCard, Badge, EmptyState, BarChart, GroupedBarChart, DonutChart, Button } from '../components/ui';
import ErrorBoundary from '../components/ErrorBoundary';
import styles from './DashboardPage.module.css';

const SALUDO = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const ROLE_LABEL = { administrador: 'Administrador', docente: 'Docente', alumno: 'Alumno' };

export default function DashboardPage() {
  const { usuario } = useAuth();
  if (!usuario) return <div className={styles.loading}>Verificando sesión...</div>;
  // El panel administrativo rediseñado solo aplica al administrador.
  // Docentes y alumnos conservan su dashboard existente (sin regresión).
  if (usuario.rol === 'administrador') return <AdminDashboard usuario={usuario} />;
  return <LegacyDashboard usuario={usuario} />;
}

// ============================================================
// ADMIN DASHBOARD (rediseñado)
// Una sola llamada a GET /api/dashboard/admin. Cada sección tiene
// su propio estado de carga/error aislado por ErrorBoundary.
// ============================================================
function AdminDashboard({ usuario }) {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getAdmin();
      setData(res?.data || null);
    } catch (err) {
      console.error('Error al cargar el panel administrativo:', err);
      setError('No se pudo cargar la información del panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [cargar, location.pathname]);

  const k = data?.kpis || {};
  const ciclo = data?.ciclo;

  return (
    <div className={styles.page}>
      <WelcomeBanner usuario={usuario} ciclo={ciclo} loading={loading} />

      {/* KPI row */}
      <ErrorBoundary name="kpis">
        <KpiSection kpis={k} loading={loading} />
      </ErrorBoundary>

      {/* Requiere atención */}
      <ErrorBoundary name="alertas">
        <AlertasSection alertas={data?.alertas} loading={loading} />
      </ErrorBoundary>

      {/* Charts */}
      <ErrorBoundary name="graficas">
        <ChartsSection graficas={data?.graficas} loading={loading} />
      </ErrorBoundary>

      {/* Comunicados + Actividad */}
      <div className={styles.lowerGrid}>
        <div className={styles.lowerLeft}>
          <ErrorBoundary name="comunicados">
            <ComunicadosSection comunicados={data?.comunicados_recientes} loading={loading} />
          </ErrorBoundary>
        </div>
        <div className={styles.lowerRight}>
          <ErrorBoundary name="actividad">
            <ActividadSection actividad={data?.actividad_reciente} loading={loading} />
          </ErrorBoundary>
        </div>
      </div>

      {error && !loading && (
        <Card>
          <div className={styles.widgetError}>
            <span><AlertTriangle size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</span>
            <Button variant="secondary" size="sm" onClick={cargar}><RefreshCw size={14} /> Reintentar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function WelcomeBanner({ usuario, ciclo, loading }) {
  const hoy = longDate(new Date());
  const nombre = usuario?.nombre || 'Administrador';
  return (
    <section className={styles.welcome}>
      <div className={styles.welcomeText}>
        <p className={styles.welcomeEyebrow}><Sparkles size={14} aria-hidden="true" /> Panel de administración</p>
        <h1 className={styles.welcomeTitle}>{SALUDO()}, {nombre}</h1>
        <div className={styles.welcomeMeta}>
          <span className={styles.welcomeMetaItem}><CalendarDays size={15} aria-hidden="true" />{hoy}</span>
          {ciclo?.nombre && <span className={styles.welcomeChip}><CalendarCheck size={13} aria-hidden="true" />Ciclo {ciclo.nombre}</span>}
        </div>
      </div>
      <div className={styles.welcomeRight}>
        <span className={styles.welcomeBadge}>{ROLE_LABEL[usuario?.rol] || 'Administrador'}</span>
        <div className={styles.welcomeActions}>
          <Link to="/comunicados" className={`${styles.bannerBtn} ${styles.bannerBtnPrimary}`}><MessageSquarePlus size={15} aria-hidden="true" />Nuevo comunicado</Link>
          <Link to="/usuarios" className={styles.bannerBtn}><UserPlus size={15} aria-hidden="true" />Registrar usuario</Link>
          <Link to="/aspirantes" className={styles.bannerBtn}><UserCheck size={15} aria-hidden="true" />Revisar aspirantes</Link>
        </div>
      </div>
    </section>
  );
}

function KpiSection({ kpis, loading }) {
  const k = kpis || {};
  const asist = k.asistencia_semana || {};
  return (
    <div className={styles.kpiGrid}>
      <StatCard loading={loading} tone="green" icon={<Users size={20} />} label="Alumnos registrados"
        value={k.alumnos?.valor ?? 0} delta={k.alumnos?.delta_mes} caption="Alumnos activos" to="/inscripciones" />
      <StatCard loading={loading} tone="info" icon={<GraduationCap size={20} />} label="Docentes activos"
        value={k.docentes?.valor ?? 0} delta={k.docentes?.delta_mes} caption="Plantilla docente" to="/usuarios" />
      <StatCard loading={loading} tone="gold" icon={<BookOpen size={20} />} label="Materias"
        value={k.materias?.valor ?? 0} caption="Catálogo académico" to="/configuracion-academica" />
      <StatCard loading={loading} tone="gray" icon={<Layers size={20} />} label="Grupos"
        value={k.grupos?.valor ?? 0} caption="Grupos activos" to="/grupos" />
      <StatCard loading={loading} tone="orange" icon={<Megaphone size={20} />} label="Comunicados"
        value={k.comunicados?.valor ?? 0} caption="Publicados" to="/comunicados" />
      <StatCard loading={loading} tone="orange" icon={<UserPlus size={20} />} label="Aspirantes pendientes"
        value={k.aspirantes_pendientes?.valor ?? 0} delta={k.aspirantes_pendientes?.delta_mes} caption="Por resolver" to="/aspirantes" />
      <StatCard loading={loading} tone="danger" icon={<AlertTriangle size={20} />} label="Incidencias abiertas"
        value={k.incidencias_abiertas?.valor ?? 0} caption="Sin resolver" to="/incidencias" />
      <StatCard loading={loading} tone="green" icon={<CalendarCheck size={20} />} label="Asistencia (7 días)"
        value={asist.valor == null ? '—' : `${asist.valor}%`}
        caption={asist.total ? `${asist.presentes}/${asist.total} registros` : 'Sin registros esta semana'} to="/asistencia" />
    </div>
  );
}

const SEV = {
  danger:  { icon: <AlertTriangle size={18} />, bg: 'var(--status-danger-bg)',  color: 'var(--status-danger)' },
  warning: { icon: <Clock size={18} />,         bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' },
  info:    { icon: <Inbox size={18} />,         bg: 'var(--status-info-bg)',    color: 'var(--status-info)' },
};

function AlertasSection({ alertas, loading }) {
  const activas = (alertas || []).filter((a) => a.cantidad > 0);
  return (
    <Card
      title="Requiere atención"
      subtitle="Tareas priorizadas calculadas con datos reales"
      actions={<Link to="/aspirantes" className={styles.verTodos}>Ver módulos →</Link>}
    >
      {loading ? (
        <div style={{ padding: 'var(--space-5)' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.6rem 0' }}>
              <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--color-surface-subtle)' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', width: '45%', height: 12, borderRadius: 4, background: 'var(--color-surface-subtle)' }} />
                <span style={{ display: 'block', width: '65%', height: 10, borderRadius: 4, background: 'var(--color-surface-subtle)', marginTop: 6 }} />
              </span>
            </div>
          ))}
        </div>
      ) : activas.length === 0 ? (
        <div className={styles.allGood}>
          <span className={styles.allGoodIcon}><CheckCircle2 size={28} aria-hidden="true" /></span>
          <p className={styles.emptyTitle}>Todo en orden</p>
          <p className={styles.emptyText}>No hay pendientes que requieran tu atención ahora mismo.</p>
        </div>
      ) : (
        <div className={styles.alertList}>
          {activas.map((a) => {
            const sev = SEV[a.severidad] || SEV.info;
            return (
              <Link key={a.id} to={a.ruta} className={styles.alertItem}>
                <span className={styles.alertIcon} style={{ background: sev.bg, color: sev.color }} aria-hidden="true">{sev.icon}</span>
                <span className={styles.alertBody}>
                  <span className={styles.alertTitle}>{a.titulo}</span>
                  <span className={styles.alertDesc}>{a.descripcion}</span>
                </span>
                <span className={styles.alertCount}>{a.cantidad}</span>
                <ChevronRight size={18} className={styles.alertArrow} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4) 0' }} aria-hidden="true">
      <span style={{ display: 'block', width: '100%', height: 160, borderRadius: 10, background: 'linear-gradient(90deg,#eef2f0,#f6f8f7,#eef2f0)', backgroundSize: '200% 100%', animation: 'dtShimmer 1.4s linear infinite' }} />
      <style>{`@keyframes dtShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion: reduce){[style*="dtShimmer"]{animation:none!important}}`}</style>
    </div>
  );
}

function ChartsSection({ graficas, loading }) {
  const g = graficas || {};
  const semestre = g.alumnos_por_semestre || [];
  const asistencia = g.asistencia_semanal || [];
  const califs = g.calificaciones_parcial || [];

  const semestreHasData = semestre.some((d) => d.valor > 0);
  const asistenciaHasData = asistencia.some((d) => d.presentes + d.ausentes > 0);
  const califsHasData = califs.length > 0;

  const asistData = asistencia.map((d) => ({ etiqueta: weekLabelShort(d.semana), series: [d.presentes, d.ausentes] }));
  const califAprob = califs.map((c) => ({ etiqueta: `P${c.parcial}`, valor: c.aprobados }));
  const califReprob = califs.map((c) => ({ etiqueta: `P${c.parcial}`, valor: c.reprobados }));

  return (
    <div className={styles.chartsGrid}>
      {/* Alumnos por semestre */}
      <div className={styles.chartCol4}>
        <Card title="Alumnos por semestre" subtitle="Distribución actual">
          {loading ? <ChartSkeleton /> : !semestreHasData ? (
            <EmptyState icon={<Users size={22} />} title="Sin alumnos" text="Todavía no hay alumnos activos registrados por semestre." />
          ) : (
            <BarChart data={semestre} ariaLabel="Alumnos por semestre" />
          )}
        </Card>
      </div>

      {/* Asistencia semanal */}
      <div className={styles.chartCol4}>
        <Card title="Asistencia semanal" subtitle="Últimas 8 semanas">
          {loading ? <ChartSkeleton /> : !asistenciaHasData ? (
            <EmptyState icon={<CalendarCheck size={22} />} title="Sin registros" text="Aún no hay asistencias cargadas en las últimas semanas." />
          ) : (
            <>
              <GroupedBarChart data={asistData} seriesLabels={['Presentes', 'Ausentes']} ariaLabel="Asistencia semanal" />
              <div className={styles.donutWrap} style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--chart-1)' }} /> Presentes
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--chart-2)' }} /> Ausentes
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Aprobados / Reprobados por parcial */}
      <div className={styles.chartCol4}>
        <Card title="Aprobados vs reprobados" subtitle="Por parcial">
          {loading ? <ChartSkeleton /> : !califsHasData ? (
            <EmptyState icon={<ClipboardList size={22} />} title="Sin calificaciones" text="Cuando se registren calificaciones verás la distribución aquí." />
          ) : (
            <>
              <BarChart data={califAprob} ariaLabel="Aprobados por parcial" height={150} />
              {califReprob.some((d) => d.valor > 0) && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Reprobados</p>
                  <BarChart data={califReprob} ariaLabel="Reprobados por parcial" height={90} />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// Pequeño helper local para etiquetar semanas de forma compacta.
function weekLabelShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

const ROL_BADGE = {
  administrador: { tone: 'info', label: 'Administración' },
  docente: { tone: 'warning', label: 'Docentes' },
  alumno: { tone: 'success', label: 'Alumnos' },
};

function ComunicadosSection({ comunicados, loading }) {
  const list = comunicados || [];
  return (
    <Card
      title="Comunicados recientes"
      subtitle="Últimos publicados"
      actions={<Link to="/comunicados" className={styles.verTodos}>Ver todos →</Link>}
    >
      {loading ? (
        <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '0.6rem 0' }}>
              <span style={{ display: 'block', width: '55%', height: 13, borderRadius: 4, background: 'var(--color-surface-subtle)' }} />
              <span style={{ display: 'block', width: '90%', height: 10, borderRadius: 4, background: 'var(--color-surface-subtle)', marginTop: 8 }} />
              <span style={{ display: 'block', width: '35%', height: 9, borderRadius: 4, background: 'var(--color-surface-subtle)', marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Megaphone size={22} />} title="Sin comunicados" text="Todavía no hay comunicados publicados." action={<Link to="/comunicados" className={styles.verTodos}>Crear comunicado</Link>} />
      ) : (
        <div className={styles.comList}>
          {list.map((c, i) => {
            const rol = ROL_BADGE[c.dirigido_a_rol] || { tone: 'neutral', label: 'General' };
            return (
              <article key={c.id || i} className={styles.comItem}>
                <div className={styles.comHead}>
                  <h4 className={styles.comTitle}>{c.titulo || 'Sin título'}</h4>
                  <Badge tone={rol.tone}>{rol.label}</Badge>
                </div>
                <p className={styles.comBody}>{c.contenido || ''}</p>
                <p className={styles.comMeta}>{c.autor ? `Por ${c.autor}` : ''}{c.autor && c.fecha_publicacion ? ' · ' : ''}{relativeDate(c.fecha_publicacion)}</p>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const ACT_TONE = {
  calificacion: 'var(--chart-1)',
  incidencia: 'var(--status-danger)',
  aspirante: 'var(--chart-2)',
  comunicado: 'var(--chart-5)',
};

function ActividadSection({ actividad, loading }) {
  const list = actividad || [];
  return (
    <Card title="Actividad reciente" subtitle="Últimos movimientos del sistema">
      {loading ? (
        <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-surface-subtle)' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', width: '50%', height: 11, borderRadius: 4, background: 'var(--color-surface-subtle)' }} />
              </span>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="Sin actividad" text="Aquí verás los registros y cambios más recientes." />
      ) : (
        <div className={styles.actList}>
          {list.map((a, i) => (
            <div key={i} className={styles.actItem}>
              <span className={styles.actDot} style={{ background: ACT_TONE[a.tipo] || 'var(--color-text-subtle)' }} aria-hidden="true" />
              <span className={styles.actBody}>
                <span className={styles.actTitle}>{a.titulo}</span>
                {a.descripcion && <span className={styles.actDesc}>{a.descripcion}</span>}
              </span>
              <span className={styles.actTime}>{relativeDate(a.fecha)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// LEGACY DASHBOARD (docente / alumno) — se conserva sin cambios
// de comportamiento para no romper features existentes.
// ============================================================
function LegacyDashboard({ usuario }) {
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

      if (usuario.rol === 'docente') {
        const materiasRes = await materiasService.getAll({ docente_id: usuario.id });
        const materias = materiasRes?.data || [];
        setStats({ materias: materias.length, grupos: new Set(materias.map((m) => m.grupo_id)).size });
      } else if (usuario.rol === 'alumno') {
        const califsRes = await calificacionesService.misCalificaciones();
        const calificaciones = califsRes?.calificaciones || [];
        setStats({ calificaciones: calificaciones.length, materias: calificaciones.length });
      }
    } catch (err) {
      console.error('Error al cargar datos del Dashboard:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.rol, location.pathname]);

  if (cargando) return <div className={styles.legacyLoading}>Cargando…</div>;

  return (
    <div className={styles.legacyPage}>
      <section className={styles.legacyWelcome}>
        <div>
          <h1 className={styles.legacyWelcomeTitle}>{SALUDO()}, {usuario.nombre || 'Usuario'}</h1>
          <p className={styles.legacyWelcomeDesc}>Bienvenido a la plataforma académica del {INSTITUCION.nombre}.</p>
        </div>
        <span className={styles.legacyWelcomeBadge}>{ROLE_LABEL[usuario.rol] || usuario.rol}</span>
      </section>

      {usuario.rol === 'docente' && (
        <div className={styles.legacyStats}>
          <LegacyStat label="Materias asignadas" value={stats.materias} to="/calificaciones" color="green" />
          <LegacyStat label="Grupos asignados" value={stats.grupos} to="/grupos" color="blue" />
        </div>
      )}
      {usuario.rol === 'alumno' && (
        <div className={styles.legacyStats}>
          <LegacyStat label="Materias cursando" value={stats.materias} to="/mis-calificaciones" color="green" />
          <LegacyStat label="Calificaciones registradas" value={stats.calificaciones} to="/mis-calificaciones" color="blue" />
          <LegacyStat label="Mi Expediente" value="Ver" to={`/expediente/${usuario.id}`} color="gold" />
        </div>
      )}

      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Comunicados recientes</h2>
          <Link to="/comunicados" className={styles.verTodos}>Ver todos →</Link>
        </div>
        {comunicados.length === 0 ? (
          <div className={styles.legacyEmpty}>No hay comunicados publicados aún.</div>
        ) : (
          <div className={styles.comList}>
            {comunicados.map((c, idx) => (
              <article key={c.id || idx} className={styles.comItem}>
                <h4 className={styles.comTitle}>{c.titulo || 'Sin título'}</h4>
                <p className={styles.comBody}>{c.contenido || ''}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LegacyStat({ label, value, to, color }) {
  const colorMap = {
    green: { bg: 'var(--green-50)', accent: 'var(--color-primary)' },
    blue: { bg: 'var(--status-info-bg)', accent: 'var(--status-info)' },
    gold: { bg: 'var(--color-accent-light)', accent: 'var(--color-accent)' },
  };
  const c = colorMap[color] || colorMap.green;
  return (
    <Link to={to} className={styles.legacyStat} style={{ '--card-bg': c.bg, '--card-accent': c.accent }}>
      <span className={styles.legacyStatValue}>{value ?? '0'}</span>
      <span className={styles.legacyStatLabel}>{label}</span>
    </Link>
  );
}






