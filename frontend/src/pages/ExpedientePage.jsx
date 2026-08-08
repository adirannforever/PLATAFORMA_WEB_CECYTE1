import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { expedienteService, catalogosService } from '../services/api';
import styles from './ExpedientePage.module.css';

const ETIQUETA_ETAPA = {
  inscripcion: 'Inscripción',
  semestral: 'Semestral',
  titulacion: 'Titulación',
};

export default function ExpedientePage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [alumnos, setAlumnos] = useState([]);
  const [alumnoId, setAlumnoId] = useState(esAdmin ? '' : usuario?.id);
  const [documentos, setDocumentos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(esAdmin);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState('');

  // Cargar lista de alumnos (solo admin)
  useEffect(() => {
    if (!esAdmin) return;
    const cargarAlumnos = async () => {
      try {
        const res = await catalogosService.getAlumnos();
        const lista = res?.data?.alumnos || (Array.isArray(res?.data) ? res.data : []);
        setAlumnos(lista);
      } catch (err) {
        console.error('Error al cargar alumnos:', err);
        setError('No se pudo cargar la lista de alumnos.');
      } finally {
        setCargandoAlumnos(false);
      }
    };
    cargarAlumnos();
  }, [esAdmin]);

  // Cargar expediente cuando hay alumno seleccionado
  useEffect(() => {
    if (!alumnoId) {
      setDocumentos([]);
      return;
    }
    const cargarExpediente = async () => {
      setCargandoExpediente(true);
      setError('');
      try {
        const res = await expedienteService.getByAlumnoId(alumnoId);
        setDocumentos(res?.data || []);
      } catch (err) {
        console.error('Error al cargar expediente:', err);
        setError('No se pudo cargar el expediente del alumno.');
        setDocumentos([]);
      } finally {
        setCargandoExpediente(false);
      }
    };
    cargarExpediente();
  }, [alumnoId]);

  const toggleEntregado = async (doc) => {
    if (!esAdmin) return; // solo admin puede modificar
    setGuardandoId(doc.documento_id);
    const nuevoEstado = !doc.entregado;
    try {
      await expedienteService.actualizarDocumento({
        alumno_id: alumnoId,
        documento_id: doc.documento_id,
        entregado: nuevoEstado,
        observaciones: doc.observaciones || '',
      });
      setDocumentos((prev) =>
        prev.map((d) =>
          d.documento_id === doc.documento_id
            ? { ...d, entregado: nuevoEstado, fecha_entrega: nuevoEstado ? new Date().toISOString() : null }
            : d
        )
      );
    } catch (err) {
      console.error('Error al actualizar documento:', err);
      setError('No se pudo actualizar el documento. Intenta de nuevo.');
    } finally {
      setGuardandoId(null);
    }
  };

  // Agrupar documentos por etapa
  const documentosPorEtapa = documentos.reduce((acc, doc) => {
    const etapa = doc.etapa || 'otros';
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(doc);
    return acc;
  }, {});

  const totalObligatorios = documentos.filter((d) => d.obligatorio).length;
  const entregadosObligatorios = documentos.filter((d) => d.obligatorio && d.entregado).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Expediente</h1>
          <p className={styles.subtitle}>
            {esAdmin
              ? 'Consulta y actualiza el expediente documental de cada alumno.'
              : 'Estado de tus documentos entregados a la institución.'}
          </p>
        </div>
      </div>

      {esAdmin && (
        <div className={styles.selectorCard}>
          <label className={styles.selectorLabel} htmlFor="alumnoSelect">
            Alumno
          </label>
          {cargandoAlumnos ? (
            <div className={styles.skeletonSelect} />
          ) : (
            <select
              id="alumnoSelect"
              className={styles.select}
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
            >
              <option value="">Selecciona un alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellidos} {a.matricula ? `— ${a.matricula}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {!alumnoId && esAdmin && !cargandoAlumnos && (
        <div className={styles.empty}>Selecciona un alumno para ver su expediente.</div>
      )}

      {alumnoId && cargandoExpediente && (
        <div className={styles.skeletonList}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {alumnoId && !cargandoExpediente && documentos.length === 0 && !error && (
        <div className={styles.empty}>No hay documentos registrados en el catálogo.</div>
      )}

      {alumnoId && !cargandoExpediente && documentos.length > 0 && (
        <>
          <div className={styles.resumenCard}>
            <span className={styles.resumenLabel}>Documentos obligatorios entregados</span>
            <span className={styles.resumenValor}>
              {entregadosObligatorios} / {totalObligatorios}
            </span>
          </div>

          {Object.entries(documentosPorEtapa).map(([etapa, docs]) => (
            <section key={etapa} className={styles.section}>
              <h2 className={styles.sectionTitle}>{ETIQUETA_ETAPA[etapa] || etapa}</h2>
              <div className={styles.docList}>
                {docs.map((doc) => (
                  <div key={doc.documento_id} className={styles.docCard}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${doc.entregado ? styles.checkboxChecked : ''}`}
                      onClick={() => toggleEntregado(doc)}
                      disabled={!esAdmin || guardandoId === doc.documento_id}
                      aria-label={doc.entregado ? 'Marcar como no entregado' : 'Marcar como entregado'}
                    >
                      {doc.entregado && '✓'}
                    </button>
                    <div className={styles.docBody}>
                      <div className={styles.docHeaderRow}>
                        <span className={styles.docNombre}>{doc.documento_nombre}</span>
                        {doc.obligatorio && <span className={styles.badgeObligatorio}>Obligatorio</span>}
                      </div>
                      <div className={styles.docMeta}>
                        {doc.entregado ? (
                          <>
                            Entregado
                            {doc.fecha_entrega &&
                              ` el ${new Date(doc.fecha_entrega).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}`}
                            {doc.recibido_por_nombre && ` · Recibió: ${doc.recibido_por_nombre}`}
                          </>
                        ) : (
                          'Pendiente de entrega'
                        )}
                      </div>
                      {doc.observaciones && <div className={styles.docObs}>{doc.observaciones}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}