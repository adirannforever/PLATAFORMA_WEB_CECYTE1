import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { POLITICA_COOKIES, LEGAL_NOTES } from '../config/legal';
import styles from './CookieBanner.module.css';

const COOKIE_CONSENT_KEY = 'cookie_consent_demo_educativo';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar si hay cookies no esenciales
    if (!POLITICA_COOKIES.tieneCookiesNoEsenciales) {
      return;
    }
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Aviso de cookies">
      <div className={styles.content}>
        <p className={styles.text}>
          {POLITICA_COOKIES.secciones[1]?.contenido || 'Usamos cookies.'} 
          <span className={styles.disclaimer}> {LEGAL_NOTES.DISCLAIMER}</span>
        </p>
        <div className={styles.actions}>
          <Link to="/legal/cookies" className={styles.link}>Más información</Link>
          <button onClick={handleDecline} className={styles.btnDecline}>Rechazar</button>
          <button onClick={handleAccept} className={styles.btnAccept}>Aceptar</button>
        </div>
      </div>
    </div>
  );
}
