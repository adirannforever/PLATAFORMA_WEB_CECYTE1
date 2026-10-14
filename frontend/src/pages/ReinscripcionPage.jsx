import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import { inscripcionesService } from '../services/api';
import styles from './ReinscripcionPage.module.css';

const FORM_INICIAL = {
  direccion: '',
  telefono_personal: '',
  nombre_tutor: '',
  telefono_tutor: '',
  curp_tutor: '',
};

export default function ReinscripcionPage() {
  const [estatus, setEstatus] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [comprobante, setComprobante] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargarEstatus = async () => {
    setError('');
    try {
      const respuesta = await inscripcionesService.getEstatusReinscripcion();
      setEstatus(respuesta);
      if (respuesta.alumno) {
        setForm({
          direccion: respuesta.alumno.direccion || '',
          telefono_personal: respuesta.alumno.telefono || '',
          nombre_tutor: respuesta.alumno.nombre_tutor || '',
          telefono_tutor: respuesta.alumno.telefono_tutor || '',
          curp_tutor: respuesta.alumno.curp_tutor || '',
        });
      }
    } catch (err) {
      console.error('Error al consultar reinscripción:', err);
      setError(err.response?.data?.message || 'No fue posible consultar tu estado de reinscripción.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstatus();
  }, []);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const enviarReinscripcion = async (event) => {
    event.preventDefault();
    setError('');
    if (!window.confirm('Al confirmar, la reinscripción se aplicará formalmente al ciclo escolar activo. ¿Deseas continuar?')) {
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await inscripcionesService.procesarCedulaReinscripcion({
        ...form,
        curp_tutor: form.curp_tutor.trim().toUpperCase(),
      });
      setComprobante(respuesta.comprobante);
      await cargarEstatus();
    } catch (err) {
      console.error('Error al procesar reinscripción:', err);
      setError(err.response?.data?.message || 'No fue posible completar la reinscripción.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <main className={styles.page} aria-busy="true"><p role="status">Cargando tu estado de reinscripción…</p></main>;
  }

  const yaReinscrito = estatus?.ya_reinscrito;
  const periodoActivo = estatus?.periodo_reinscripcion?.valido === true;
  const elegible = estatus?.elegible === true;
  const grupoDisponible = Boolean(estatus?.grupo_sugerido);
  const puedeEnviar = !yaReinscrito && periodoActivo && elegible && grupoDisponible;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.icon}><ClipboardCheck size={22} aria-hidden="true" /></span>
          <div>
            <h1 className={styles.title}>Reinscripción</h1>
            <p className={styles.subtitle}>Confirma tus datos para continuar al siguiente semestre.</p>
          </div>
        </div>
        {estatus?.ciclo?.nombre && (
          <div className={styles.cycle}><CalendarDays size={17} aria-hidden="true" /> {estatus.ciclo.nombre}</div>
        )}
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {estatus && !estatus.success && (
        <section className={styles.panel}><p>{estatus.message || 'No se pudo consultar el estado académico.'}</p></section>
      )}

      {estatus?.success && yaReinscrito && (
        <section className={styles.confirmation} role="status">
          <CheckCircle2 size={28} aria-hidden="true" />
          <div>
            <h2>Ya estás reinscrito</h2>
            <p>{estatus.mensaje}</p>
            <p>
              Grupo: <strong>{estatus.grupo_asignado?.grupo_nombre || 'Asignado'}</strong>
              {estatus.grupo_asignado?.semestre ? ` · Semestre ${estatus.grupo_asignado.semestre}` : ''}
            </p>
            {comprobante?.folio && <p>Folio de confirmación: <strong>{comprobante.folio}</strong></p>}
          </div>
        </section>
      )}

      {estatus?.success && !yaReinscrito && (
        <>
          <section className={styles.summary}>
            <div><span>Semestre actual</span><strong>{estatus.alumno?.semestre_actual || '—'}</strong></div>
            <div><span>Semestre a cursar</span><strong>{estatus.alumno?.semestre_siguiente || '—'}</strong></div>
            <div><span>Especialidad</span><strong>{estatus.alumno?.especialidad || '—'}</strong></div>
            <div><span>Grupo sugerido</span><strong>{estatus.grupo_sugerido ? `${estatus.grupo_sugerido.nombre} · ${estatus.grupo_sugerido.turno}` : 'Pendiente de asignación'}</strong></div>
          </section>

          {!periodoActivo && (
            <div className={styles.notice} role="status">
              {estatus.periodo_reinscripcion?.mensaje || 'El periodo de reinscripción no está disponible.'}
            </div>
          )}
          {estatus.elegible === false && (
            <div className={styles.notice} role="alert">
              {estatus.motivo_bloqueo || 'Tu situación académica requiere revisión de Control Escolar.'}
            </div>
          )}
          {!grupoDisponible && (
            <div className={styles.notice} role="status">
              No hay un grupo configurado para tu siguiente semestre. Contacta a Control Escolar.
            </div>
          )}

          <form className={styles.panel} onSubmit={enviarReinscripcion}>
            <h2>Verifica tus datos de contacto</h2>
            <p className={styles.formIntro}>Los campos marcados con * son obligatorios. Al confirmar, la reinscripción se registra formalmente.</p>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Dirección *</span>
                <input name="direccion" autoComplete="street-address" maxLength={250} required value={form.direccion} onChange={actualizarCampo} />
              </label>
              <label className={styles.field}>
                <span>Teléfono personal</span>
                <input name="telefono_personal" type="tel" autoComplete="tel" maxLength={20} value={form.telefono_personal} onChange={actualizarCampo} />
              </label>
              <label className={styles.field}>
                <span>Nombre del tutor *</span>
                <input name="nombre_tutor" autoComplete="name" maxLength={150} required value={form.nombre_tutor} onChange={actualizarCampo} />
              </label>
              <label className={styles.field}>
                <span>Teléfono del tutor *</span>
                <input name="telefono_tutor" type="tel" maxLength={20} required value={form.telefono_tutor} onChange={actualizarCampo} />
              </label>
              <label className={styles.field}>
                <span>CURP del tutor</span>
                <input name="curp_tutor" maxLength={18} value={form.curp_tutor} onChange={actualizarCampo} />
              </label>
            </div>
            <div className={styles.formFooter}>
              <p>Si tus datos no son correctos o necesitas apoyo, acude a Control Escolar.</p>
              <button className={styles.submit} type="submit" disabled={!puedeEnviar || enviando}>
                {enviando ? <><Loader2 size={17} className={styles.spinner} /> Procesando…</> : 'Confirmar reinscripción'}
              </button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
