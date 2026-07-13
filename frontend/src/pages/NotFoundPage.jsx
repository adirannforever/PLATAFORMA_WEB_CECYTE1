// src/pages/NotFoundPage.jsx
import { useNavigate } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo simplificado */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" fill="#1a6b35" stroke="#c8992a" strokeWidth="2.5"/>
          <text x="32" y="27" textAnchor="middle" fill="#c8992a" fontSize="12" fontWeight="700" fontFamily="Inter,sans-serif">CECyTE</text>
          <text x="32" y="41" textAnchor="middle" fill="white" fontSize="9" fontFamily="Inter,sans-serif">TABASCO</text>
        </svg>

        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Página no encontrada</h2>
        <p className={styles.desc}>
          La ruta que buscas no existe o no tienes permisos para acceder a ella.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
            Ir al inicio
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate(-1)}>
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}
