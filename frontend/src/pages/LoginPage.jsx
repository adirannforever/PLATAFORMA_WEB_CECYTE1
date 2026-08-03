// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';
import logoCecyte from '../assets/logo_cecyte.png'

const LogoCECyTE = () => (
  <img 
    src={logoCecyte} 
    alt="Logo CECyTE" 
    style={{ 
      width: '308px', 
      height: '308px', 
      objectFit: 'cover',
    }} 
  />
);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus datos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.panelContent}>
          <LogoCECyTE />

          <p className={styles.panelDesc}>
            Plataforma Web Académica del CECyTE Plantel 1 
          </p>
          <div className={styles.panelBadge}>
            Colegio de Estudios Científicos y Tecnológicos del Estado de Tabasco
          </div>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Iniciar sesión</h2>
            <p className={styles.formDesc}>Accede con tu cuenta institucional</p>
          </div>

          {error && (
            <div className={styles.errorMsg} role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label} >Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="correo@cecyte1.edu.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Contraseña</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={cargando}>
              {cargando ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <p className={styles.helpText}>
            ¿Problemas para acceder? Contacta al administrador del plantel.
          </p>
        </div>

        <p className={styles.footer}>
          © {new Date().getFullYear()} CECyTE Tabasco Plantel 1 · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
