import { useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { aspirantesService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MiSolicitudAspirantePage.module.css';

const ESTATUS = {
  registrado: 'Solicitud registrada',
  documentos_pendientes: 'Documentos pendientes',
  ficha_pagada: 'Ficha pagada',
  examen_aprobado: 'Examen aprobado',
  aceptado: 'Aceptado',
  rechazado: 'No aceptado',
  inscrito: 'Inscrito',
};

export default function MiSolicitudAspirantePage() {
  const [aspirante, setAspirante] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    aspirantesService.getMe()
      .then((response) => setAspirante(response.aspirante))
      .catch((err) => {
        console.error('Error cargando solicitud del aspirante:', err);
        setError(err.response?.data?.message || 'No se pudo consultar tu solicitud.');
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className={styles.page}><Skeleton height="2.5rem" /></div>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.icon}><FileCheck2 size={22} aria-hidden="true" /></div>
        <div>
          <h1>Mi solicitud</h1>
          <p>Consulta el avance de tu proceso de admisión.</p>
        </div>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {aspirante && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.label}>Folio</span>
              <strong className={styles.folio}>{aspirante.folio}</strong>
            </div>
            <span className={styles.status}>{ESTATUS[aspirante.estatus] || aspirante.estatus}</span>
          </div>
          <h2>{aspirante.nombre} {aspirante.apellidos}</h2>
          <dl className={styles.details}>
            <div><dt>Correo</dt><dd>{aspirante.email}</dd></div>
            <div><dt>Especialidad</dt><dd>{aspirante.especialidad_nombre || 'Por confirmar'}</dd></div>
            <div><dt>Turno preferido</dt><dd>{aspirante.turno_nombre || 'Por confirmar'}</dd></div>
            <div><dt>Ciclo escolar</dt><dd>{aspirante.ciclo_nombre || 'Por confirmar'}</dd></div>
            <div><dt>Fecha de registro</dt><dd>{new Date(aspirante.fecha_registro).toLocaleDateString('es-MX')}</dd></div>
          </dl>
          <p className={styles.help}>Para corregir tus datos o entregar documentos, comunícate con Control Escolar.</p>
        </section>
      )}
    </main>
  );
}
