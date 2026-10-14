import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AVISO_PRIVACIDAD, FOOTER_LEGAL, LEGAL_NOTES } from '../config/legal';
import styles from './LegalPages.module.css';

export default function LegalPrivacidad() {
  useEffect(() => {
    document.title = `${AVISO_PRIVACIDAD.titulo} - ${LEGAL_NOTES.DISCLAIMER}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{AVISO_PRIVACIDAD.titulo}</h1>
        <p className={styles.subtitle}>{AVISO_PRIVACIDAD.subtitulo}</p>
        <p className={styles.disclaimer}>⚠️ {LEGAL_NOTES.DISCLAIMER}</p>
        <p className={styles.meta}>
          Versión: {AVISO_PRIVACIDAD.version} | Actualización: {AVISO_PRIVACIDAD.fechaActualizacion}
        </p>
      </header>

      <main className={styles.content}>
        {AVISO_PRIVACIDAD.secciones.map((seccion, idx) => (
          <section key={idx} className={styles.section}>
            <h2 className={styles.sectionTitle}>{seccion.titulo}</h2>
            <p className={styles.explicacion}>{seccion.explicacion}</p>
            <p className={styles.contenido}>{seccion.contenido}</p>
          </section>
        ))}
      </main>

      <div className={styles.navigation}>
        <Link to="/" className={styles.link}>← Volver al inicio</Link>
        <Link to="/legal/terminos" className={styles.link}>Términos y Condiciones →</Link>
      </div>

      <footer className={styles.footer}>
        <p>{FOOTER_LEGAL.textoCopyright}</p>
      </footer>
    </div>
  );
}
