import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TERMINOS_CONDICIONES, FOOTER_LEGAL, LEGAL_NOTES } from '../config/legal';
import styles from './LegalPages.module.css';

export default function LegalTerminos() {
  useEffect(() => {
    document.title = `${TERMINOS_CONDICIONES.titulo} - ${LEGAL_NOTES.DISCLAIMER}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{TERMINOS_CONDICIONES.titulo}</h1>
        <p className={styles.subtitle}>{TERMINOS_CONDICIONES.subtitulo}</p>
        <p className={styles.disclaimer}>⚠️ {LEGAL_NOTES.DISCLAIMER}</p>
        <p className={styles.meta}>
          Versión: {TERMINOS_CONDICIONES.version} | Actualización: {TERMINOS_CONDICIONES.fechaActualizacion}
        </p>
      </header>

      <main className={styles.content}>
        {TERMINOS_CONDICIONES.secciones.map((seccion, idx) => (
          <section key={idx} className={styles.section}>
            <h2 className={styles.sectionTitle}>{seccion.titulo}</h2>
            <p className={styles.explicacion}>{seccion.explicacion}</p>
            <p className={styles.contenido}>{seccion.contenido}</p>
          </section>
        ))}
      </main>

      <div className={styles.navigation}>
        <Link to="/legal/privacidad" className={styles.link}>← Aviso de Privacidad</Link>
        <Link to="/legal/cookies" className={styles.link}>Política de Cookies →</Link>
      </div>

      <footer className={styles.footer}>
        <p>{FOOTER_LEGAL.textoCopyright}</p>
      </footer>
    </div>
  );
}
