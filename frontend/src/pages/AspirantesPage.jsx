import { useEffect, useState } from 'react';
import { aspirantesService, catalogosService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './AspirantesPage.module.css';

const ESTATUS_OPCIONES = [
  { valor: 'registrado', etiqueta: 'Registrado' },
  { valor: 'documentos_pendientes', etiqueta: 'Docs. pendientes' },
  { valor: 'ficha_pagada', etiqueta: 'Ficha pagada' },
  { valor: 'examen_aprobado', etiqueta: 'Examen aprobado' },
  { valor: 'aceptado', etiqueta: 'Aceptado' },
  { valor: 'rechazado', etiqueta: 'Rechazado' },
  { valor: 'inscrito', etiqueta: 'Inscrito' },
];

const COLOR_ESTATUS = {
  registrado: 'gray',
  documentos_pendientes: 'orange',
  ficha_pagada: 'blue',
  examen_aprobado: 'teal',
  aceptado: 'green',
  rechazado: 'red',
  inscrito: 'dark',
};

const ETIQUETA_ESTATUS = ESTATUS_OPCIONES.reduce((acc, e) => {
  acc[e.valor] = e.etiqueta;
  return acc;
}, {});

export default function AspirantesPage() {
  const [aspirantes, setAspirantes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [form, setForm] = useState({
    nombre: '', apellidos: '', curp: '', email: '', telefono: '',
    especialidad_id: '', turno_preferido_id: '', ciclo_id: '', folio: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  const [modalEstatusAbierto, setModalEstatusAbierto] = useState(false);
  const [aspiranteEstatus, setAspiranteEstatus] = useState(null);
  const [nuevoEstatus, setNuevoEstatus] = useState('');
  const [enviandoEstatus, setEnviandoEstatus] = useState(false);
  const [errorEstatus, setErrorEstatus] = useState('');

  const [modalConvertirAbierto, setModalConvertirAbierto] = useState(false);
  const [aspiranteConvertir, setAspiranteConvertir] = useState(null);
  const [grupoId, setGrupoId] = useState('');
  const [enviandoConvertir, setEnviandoConvertir] = useState(false);
  const [errorConvertir, setErrorConvertir] = useState('');
  const [exitoConvertir, setExitoConvertir] = useState('');

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [espRes, turnRes, ciclosRes, gruposRes] = await Promise.all([
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
          catalogosService.getCiclos(),
          catalogosService.getGrupos(),
        ]);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
        setCiclos(ciclosRes.data || []);
        setGrupos(gruposRes.data || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      if (busqueda.trim()) params.search = busqueda.trim();
      if (filtroEstatus !== 'todos') params.estatus = filtroEstatus;
      if (filtroCiclo) params.ciclo_id = filtroCiclo;
      if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
      if (filtroTurno) params.turno_id = filtroTurno;
      const res = await aspirantesService.getAll(params);
      setAspirantes(res.aspirantes || []);
    } catch (e) {
      console.error('Error cargando aspirantes:', e);
      setError('No se pudieron cargar los aspirantes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 400 : 0);
    return () => clearTimeout(t);
  }, [busqueda, filtroEstatus, filtroCiclo, filtroEspecialidad, filtroTurno]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrorCrear('');
    try {
      await aspirantesService.crear({
        ...form,
        especialidad_id: Number(form.especialidad_id),
        turno_preferido_id: Number(form.turno_preferido_id),
        ciclo_id: Number(form.ciclo_id),
      });
      setModalCrearAbierto(false);
      setForm({ nombre: '', apellidos: '', curp: '', email: '', telefono: '', especialidad_id: '', turno_preferido_id: '', ciclo_id: '', folio: '' });
      setExito('Aspirante registrado correctamente.');
      cargar();
    } catch (err) {
      setErrorCrear(err.response?.data?.message || 'Error al registrar el aspirante.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirEstatus = (asp) => {
    setAspiranteEstatus(asp);
    setNuevoEstatus(asp.estatus);
    setErrorEstatus('');
    setModalEstatusAbierto(true);
  };

  const handleEstatus = async (e) => {
    e.preventDefault();
    setEnviandoEstatus(true);
    setErrorEstatus('');
    try {
      await aspirantesService.actualizarEstatus(aspiranteEstatus.id, nuevoEstatus);
      setModalEstatusAbierto(false);
      setExito('Estatus actualizado correctamente.');
      cargar();
    } catch (err) {
      setErrorEstatus(err.response?.data?.message || 'Error al actualizar el estatus.');
    } finally {
      setEnviandoEstatus(false);
    }
  };

  const abrirConvertir = (asp) => {
    setAspiranteConvertir(asp);
    setGrupoId('');
    setErrorConvertir('');
    setExitoConvertir('');
    setModalConvertirAbierto(true);
  };

  const handleConvertir = async (e) => {
    e.preventDefault();
    setEnviandoConvertir(true);
    setErrorConvertir('');
    setExitoConvertir('');
    try {
      const res = await aspirantesService.convertirAAlumno({
        aspirante_id: aspiranteConvertir.id,
        grupo_id: Number(grupoId),
      });
      setExitoConvertir(`Convertido exitosamente. Matrícula: ${res.data.matricula}`);
      cargar();
    } catch (err) {
      setErrorConvertir(err.response?.data?.message || 'Error al convertir el aspirante.');
    } finally {
      setEnviandoConvertir(false);
    }
  };

  const puedeConvertir = (asp) => !['inscrito', 'rechazado'].includes(asp.estatus);

  const badgeClass = (estatus) => `${styles.badge} ${styles['badge_' + (COLOR_ESTATUS[estatus] || 'gray')]}`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Aspirantes</h1>
          <p className={styles.subtitle}>Gestión de aspirantes y conversión a alumnos</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={cargar}>Actualizar</button>
          <button className={styles.btnPrimary} onClick={() => { setModalCrearAbierto(true); setErrorCrear(''); }}>+ Nuevo aspirante</button>
        </div>
      </div>

      {exito && <div className={styles.successMsg}>{exito}</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      <div className={styles.filtrosExtras}>
        <div className={styles.busqueda}>
          <label className={styles.label}>Buscar</label>
          <input
            className={styles.input}
            placeholder="Nombre, CURP, email o folio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className={styles.filtroEstado}>
          <label className={styles.label}>Estatus</label>
          <select className={styles.select} value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}>
            <option value="todos">Todos</option>
            {ESTATUS_OPCIONES.map((op) => (
              <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroCiclo}>
          <label className={styles.label}>Ciclo</label>
          <select className={styles.select} value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)}>
            <option value="">Todos</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroEspecialidad}>
          <label className={styles.label}>Especialidad</label>
          <select className={styles.select} value={filtroEspecialidad} onChange={(e) => setFiltroEspecialidad(e.target.value)}>
            <option value="">Todas</option>
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>{esp.nombre}</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroTurno}>
          <label className={styles.label}>Turno</label>
          <select className={styles.select} value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>
            <option value="">Todos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <Skeleton />
      ) : aspirantes.length === 0 ? (
        <div className={styles.empty}>No se encontraron aspirantes.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Folio</th>
                <th className={styles.th}>Aspirante</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Especialidad</th>
                <th className={styles.th}>Turno</th>
                <th className={styles.th}>Ciclo</th>
                <th className={styles.th}>Estatus</th>
                <th className={styles.th}>Registro</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {aspirantes.map((asp) => (
                <tr key={asp.id} className={styles.tr}>
                  <td className={styles.td}><span className={styles.folio}>{asp.folio}</span></td>
                  <td className={styles.td}>
                    <div className={styles.userCell}>
                      <div className={`${styles.avatar} ${styles.avatar_green}`}>{asp.nombre?.charAt(0)}{asp.apellidos?.charAt(0)}</div>
                      <div>
                        <div className={styles.userName}>{asp.nombre} {asp.apellidos}</div>
                        <div className={styles.userId}>CURP: {asp.curp}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}><span className={styles.email}>{asp.email}</span></td>
                  <td className={styles.td}>{asp.especialidad_nombre || '—'}</td>
                  <td className={styles.td}>{asp.turno_nombre || '—'}</td>
                  <td className={styles.td}>{asp.ciclo_nombre || '—'}</td>
                  <td className={styles.td}>
                    <span className={badgeClass(asp.estatus)}>
                      {ETIQUETA_ESTATUS[asp.estatus] || asp.estatus}
                    </span>
                  </td>
                  <td className={styles.td}><span className={styles.fecha}>{new Date(asp.fecha_registro).toLocaleDateString('es-MX')}</span></td>
                  <td className={styles.td}>
                    <button className={styles.btnEditar} onClick={() => abrirEstatus(asp)}>Estatus</button>
                    {puedeConvertir(asp) && (
                      <button className={styles.btnConvertir} onClick={() => abrirConvertir(asp)}>Convertir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalCrearAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalCrearAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Registrar aspirante</h2>
            <form className={styles.form} onSubmit={handleCrear}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre(s)</label>
                  <input className={styles.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellidos</label>
                  <input className={styles.input} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required />
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>CURP</label>
                  <input className={styles.input} value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input className={styles.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Teléfono</label>
                  <input className={styles.input} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Folio (opcional)</label>
                  <input className={styles.input} value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} placeholder="Auto si se deja vacío" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select className={styles.select} value={form.especialidad_id} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Turno preferido</label>
                  <select className={styles.select} value={form.turno_preferido_id} onChange={(e) => setForm({ ...form, turno_preferido_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {turnos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Ciclo escolar</label>
                  <select className={styles.select} value={form.ciclo_id} onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {ciclos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              {errorCrear && <div className={styles.errorMsg}>{errorCrear}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalCrearAbierto(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>{enviando ? 'Guardando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEstatusAbierto && aspiranteEstatus && (
        <div className={styles.modalOverlay} onClick={() => setModalEstatusAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Cambiar estatus</h2>
            <p className={styles.helpText}>{aspiranteEstatus.nombre} {aspiranteEstatus.apellidos} ({aspiranteEstatus.folio})</p>
            <form className={styles.form} onSubmit={handleEstatus}>
              <div className={styles.field}>
                <label className={styles.label}>Nuevo estatus</label>
                <select className={styles.select} value={nuevoEstatus} onChange={(e) => setNuevoEstatus(e.target.value)} required>
                  {ESTATUS_OPCIONES.map((op) => (
                    <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
                  ))}
                </select>
              </div>
              {errorEstatus && <div className={styles.errorMsg}>{errorEstatus}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalEstatusAbierto(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={enviandoEstatus}>{enviandoEstatus ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConvertirAbierto && aspiranteConvertir && (
        <div className={styles.modalOverlay} onClick={() => setModalConvertirAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Convertir a alumno</h2>
            <p className={styles.helpText}>{aspiranteConvertir.nombre} {aspiranteConvertir.apellidos} ({aspiranteConvertir.folio})</p>
            {exitoConvertir ? (
              <>
                <div className={styles.successMsg}>{exitoConvertir}</div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setModalConvertirAbierto(false)}>Cerrar</button>
                </div>
              </>
            ) : (
              <form className={styles.form} onSubmit={handleConvertir}>
                <div className={styles.field}>
                  <label className={styles.label}>Grupo de destino</label>
                  <select className={styles.select} value={grupoId} onChange={(e) => setGrupoId(e.target.value)} required>
                    <option value="">Seleccionar grupo...</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                  <span className={styles.helpText}>Se creará el usuario, la matrícula y se inscribirá al aspirante en el grupo.</span>
                </div>
                {errorConvertir && <div className={styles.errorMsg}>{errorConvertir}</div>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setModalConvertirAbierto(false)}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary} disabled={enviandoConvertir}>{enviandoConvertir ? 'Convirtiendo...' : 'Convertir'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}