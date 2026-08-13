// frontend/src/pages/MisClasesPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { gruposService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';

export default function MisClasesPage() {
  const { usuario } = useAuth();
  const { isDocente } = usePermissions();
  const navigate = useNavigate();

  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarGrupos = async () => {
      if (!isDocente) return;
      setCargando(true);
      setError('');
      try {
        const res = await gruposService.getAll({ docente_id: usuario.id });
        setGrupos(res.data || []);
      } catch (e) {
        console.error('Error cargando grupos:', e);
        setError('No se pudieron cargar tus grupos.');
      } finally {
        setCargando(false);
      }
    };
    cargarGrupos();
  }, [isDocente, usuario.id]);

  const seleccionarGrupo = (grupoId) => {
    navigate(`/mis-clases/grupo/${grupoId}/materias`);
  };

  if (cargando) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Mis Clases</h1>
          <p className={styles.subtitle}>Cargando tus grupos...</p>
        </div>
        <div className={styles.gruposGrid}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={styles.grupoCardSkeleton}>
              <Skeleton width="100%" height="120px" variant="rect" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Mis Clases</h1>
          <p className={styles.subtitle}>Error al cargar</p>
        </div>
        <div className={styles.errorMsg}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Mis Clases</h1>
        <p className={styles.subtitle}>Selecciona un grupo para gestionar sus actividades</p>
      </div>

      {grupos.length === 0 ? (
        <div className={styles.empty}>
          <p>No tienes grupos asignados.</p>
          <p className={styles.emptySub}>Contacta a la Coordinación Académica.</p>
        </div>
      ) : (
        <div className={styles.gruposGrid}>
          {grupos.map((grupo) => (
            <div
              key={grupo.id}
              className={styles.grupoCard}
              onClick={() => seleccionarGrupo(grupo.id)}
            >
              <div className={styles.grupoCardContent}>
                <h3 className={styles.grupoCardNombre}>{grupo.nombre}</h3>
                <div className={styles.grupoCardMeta}>
                  <span>{grupo.especialidad || '—'}</span>
                  <span>{grupo.semestre}°</span>
                  <span>{grupo.turno || '—'}</span>
                </div>
                <span className={styles.grupoCardCiclo}>{grupo.ciclo}</span>
              </div>
              <div className={styles.grupoCardArrow}>→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}