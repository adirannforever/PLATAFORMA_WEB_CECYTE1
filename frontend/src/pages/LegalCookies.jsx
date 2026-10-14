import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { POLITICA_COOKIES, FOOTER_LEGAL, LEGAL_NOTES } from '../config/legal';
import styles from './LegalPages.module.css';

export default function LegalCookies() {
  useEffect(() => {
    document.title = `${POLITICA_COOKIES.titulo} - ${LEGAL_NOTES.DISCLAIMER}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{POLITICA_COOKIES.titulo}</h1>
        <p className={styles.subtitle}>{POLITICA_COOKIES.subtitulo}</p>
        <p className={styles.disclaimer}>⚠️ {LEGAL_NOTES.DISCLAIMER}</p>
        <p className={styles.meta}>
          Versión: {POLITICA_COOKIES.version} | Actualización: {POLITICA_COOKIES.fechaActualizacion}
        </p>
      </header>

      <main className={styles.content}>
        {POLITICA_COOKIES.secciones.map((seccion, idx) => (
          <section key={idx} className={styles.section}>
            <h2 className={styles.sectionTitle}>{seccion.titulo}</h2>
            <p className={styles.explicacion}>{seccion.explicacion}</p>
            <p className={styles.contenido}>{seccion.contenido}</p>
          </section>
        ))}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nota sobre banner de cookies</h2>
          <p className={styles.explicacion}>{POLITICA_COOKIES.explicacionBanner}</p>
          <p className={styles.contenido}>
            Cookies no esenciales: {POLITICA_COOKIES.tieneCookiesNoEsenciales ? 'Sí' : 'No'}.
            Solo se mostrará banner si existen cookies no esenciales.
          </p>
        </section>
      </main>

      <div className={styles.navigation}>
        <Link to="/legal/terminos" className={styles.link}>← Términos y Condiciones</Link>
        <Link to="/" className={styles.link}>Volver al inicio →</Link>
      </div>

      <footer className={styles.footer}>
        <p>{FOOTER_LEGAL.textoCopyright}</p>
      </footer>
    </div>
  );
}
