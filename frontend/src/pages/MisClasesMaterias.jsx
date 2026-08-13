// frontend/src/pages/MisClasesMaterias.jsx
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { gruposService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';

export default function MisClasesMaterias({ grupoId }) {
  const [materias, setMaterias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await gruposService.getMaterias(grupoId);
        setMaterias(res.materias || []);
      } catch (e) {
        console.error('Error cargando materias:', e);
        setError('No se pudieron cargar las materias.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [grupoId]);

  if (cargando) {
    return (
      <div className={styles.skeletonContainer}>
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.materiaCardSkeleton}>
            <Skeleton width="200px" height="20px" variant="text" />
            <Skeleton width="150px" height="16px" variant="text" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMsg}>{error}</div>;
  }

  if (materias.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No tienes materias asignadas en este grupo.</p>
      </div>
    );
  }

  return (
    <div className={styles.materiasList}>
      {materias.map((m) => (
        <div key={m.id} className={styles.materiaCard}>
          <div className={styles.materiaInfo}>
            <span className={styles.materiaNombre}>{m.materia_nombre}</span>
            <span className={styles.materiaDocente}>
              {m.docente_nombre} {m.docente_apellidos}
            </span>
          </div>
          <NavLink
            to={`/mis-clases/materia/${m.id}`}
            className={styles.btnVerCalificaciones}
          >
            Ver calificaciones →
          </NavLink>
        </div>
      ))}
    </div>
  );
}