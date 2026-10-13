import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '../services/api';
import styles from './ActivarCuentaAspirantePage.module.css';

export default function ActivarCuentaAspirantePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const activarCuenta = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEnviando(true);
    try {
      await authService.activarCuentaAspirante(token, password);
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo activar la cuenta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {exito ? (
          <div className={styles.success}>
            <CheckCircle2 size={34} aria-hidden="true" />
            <h1>Acceso activado</h1>
            <p>Tu cuenta está lista. Ya puedes iniciar sesión con el correo al que llegó la invitación.</p>
            <Link className={styles.button} to="/login?force=1">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <>
            <h1>Activa tu cuenta de aspirante</h1>
            <p className={styles.intro}>Define una contraseña segura para consultar el estado de tu solicitud.</p>
            {!token ? (
              <p className={styles.error} role="alert">El enlace está incompleto. Solicita una nueva invitación a Control Escolar.</p>
            ) : (
              <form onSubmit={activarCuenta} className={styles.form}>
                <label className={styles.field}>
                  <span>Nueva contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <small>Usa al menos 12 caracteres.</small>
                </label>
                <label className={styles.field}>
                  <span>Confirma la contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={confirmacion}
                    onChange={(event) => setConfirmacion(event.target.value)}
                  />
                </label>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button className={styles.button} type="submit" disabled={enviando}>
                  {enviando ? <><Loader2 size={17} className={styles.spinner} /> Activando…</> : 'Activar cuenta'}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
