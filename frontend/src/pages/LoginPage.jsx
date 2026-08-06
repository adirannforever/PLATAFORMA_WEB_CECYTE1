import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';
import logoCecyte from '../assets/logo_cecyte.png';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleReturn = () => {
    navigate('/');
  };

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
      {/* Panel Lateral (Branding / Bienvenida) */}
      <div className={styles.panel}>
        <button type="button" onClick={handleReturn} className={styles.returnBtn}>
          <ArrowLeft size={18} />
          <span>Página principal</span>
        </button>

        <div className={styles.panelContent}>
          <img 
            src={logoCecyte} 
            alt="Logo CECyTE" 
            className={styles.logoImg} 
          />
          <h1 className={styles.panelTitle}>CECyTE Plantel 1</h1>
          <p className={styles.panelDesc}>
            Plataforma Web Académica y de Gestión Institucional
          </p>
        </div>
      </div>

      {/* Lado del Formulario */}
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Iniciar sesión</h2>
            <p className={styles.formDesc}>Accede con tu cuenta institucional</p>
          </div>

          {error && (
            <div className={styles.errorMsg} role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="correo@cecytab.edu.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={cargando}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Contraseña</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputPassword}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  disabled={cargando}
                  className={styles.togglePassBtn}
                  title={showPass ? 'Ocultar' : 'Ver'}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={cargando}>
              {cargando ? (
                <span className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} /> Verificando...
                </span>
              ) : (
                'Entrar al Sistema'
              )}
            </button>
          </form>

          <p className={styles.helpText}>
            ¿Problemas para acceder? Contacta al área de control escolar o al administrador del plantel.
          </p>
        </div>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} CECyTE Tabasco Plantel 1 · Todos los derechos reservados
        </footer>
      </div>
    </div>
  );
}