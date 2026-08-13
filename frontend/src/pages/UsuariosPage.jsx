import { useEffect, useState } from 'react';
import { usuariosService, catalogosService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './UsuariosPage.module.css';

const ROLES = ['todos', 'alumno', 'docente', 'administrador'];
const ETIQUETA = { alumno: 'Alumno', docente: 'Docente', administrador: 'Admin' };
const COLOR_ROL = { alumno: 'green', docente: 'orange', administrador: 'dark' };

const getSemestreGrupo = (semestre, grupoNombre) => {
  if (!grupoNombre) return semestre ? `${semestre}°` : 'Sin asignar';
  const match = grupoNombre.match(/^(\d+°[A-Z])/);
  if (match) {
    return match[1];
  }
  return grupoNombre;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '', rol: 'alumno', matricula: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formEditar, setFormEditar] = useState({ nombre: '', apellidos: '', email: '', rol: '', activo: true, password: '', });
  const [enviandoEditar, setEnviandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState('');

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [ciclosRes, espRes, turnRes, gruposRes] = await Promise.all([
          catalogosService.getCiclos(),
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
          catalogosService.getGrupos(),
        ]);
        setCiclos(ciclosRes.data || []);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
        setGrupos(gruposRes.data || []);
        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo) {
          setFiltroCiclo(String(activo.id));
        }
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  const cargar = async () => {
    setCargando(true);
    setError('');
    setExito('');
    try {
      const params = {};
      if (filtro !== 'todos') params.rol = filtro;
      if (busqueda.trim()) params.search = busqueda.trim();
      if (filtroEstado !== 'todos') params.activo = filtroEstado === 'activo' ? 'true' : 'false';
      if (filtroCiclo) params.ciclo_id = filtroCiclo;
      if (filtroSemestre) params.semestre = filtroSemestre;
      if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
      if (filtroTurno) params.turno_id = filtroTurno;
      if (filtroGrupo) params.grupo_id = filtroGrupo;

      const res = await usuariosService.getAll(params);
      setUsuarios(res.usuarios || []);
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
      setError('No se pudieron cargar los usuarios.');
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filtro, busqueda, filtroEstado, filtroCiclo, filtroSemestre, filtroEspecialidad, filtroTurno, filtroGrupo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await usuariosService.crear(form);
      setExito(' Usuario creado correctamente.');
      setForm({ nombre: '', apellidos: '', email: '', password: '', rol: 'alumno', matricula: '' });
      setModalAbierto(false);
      await cargar();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear usuario.');
    } finally {
      setEnviando(false);
    }
  };

  const handleDesactivar = async (id) => {
    if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
    try {
      await usuariosService.desactivar(id);
      setExito(' Usuario desactivado.');
      await cargar();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al desactivar.');
    }
  };

  const handleReactivar = async (id) => {
    if (!confirm('¿Reactivar este usuario?')) return;
    try {
      await usuariosService.actualizar(id, { activo: true });
      setExito(' Usuario reactivado.');
      await cargar();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al reactivar.');
    }
  };

  const handleAbrirEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setFormEditar({
      nombre: usuario.nombre || '',
      apellidos: usuario.apellidos || '',
      email: usuario.email || '',
      rol: usuario.rol || '',
      activo: usuario.activo
    });
    setErrorEditar('');
    setModalEditarAbierto(true);
  };

  const handleEditarUsuario = async (e) => {
    e.preventDefault();
    setErrorEditar('');
    setEnviandoEditar(true);
    try {
      // Actualizar datos generales
      await usuariosService.actualizar(usuarioEditando.id, {
        nombre: formEditar.nombre,
        apellidos: formEditar.apellidos,
        email: formEditar.email,
        rol: formEditar.rol,
        activo: formEditar.activo,
      });

      // Si se escribió una contraseña, actualizarla
      if (formEditar.password && formEditar.password.trim().length >= 8) {
        await usuariosService.actualizarPassword(usuarioEditando.id, {
          password: formEditar.password,
        });
      }

      setExito(' Usuario actualizado.');
      setModalEditarAbierto(false);
      await cargar();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      setErrorEditar(err.response?.data?.message || 'Error al actualizar usuario.');
    } finally {
      setEnviandoEditar(false);
    }
  };

  return (
    <div className={styles.page}>
      {exito && <div className={styles.successMsg}>{exito}</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>{usuarios.length} usuario(s)</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
            ↻ Refrescar
          </button>
          <button className={styles.btnPrimary} onClick={() => setModalAbierto(true)}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Filtros por rol */}
      <div className={styles.filtros}>
        {ROLES.map(r => (
          <button
            key={r}
            className={`${styles.filtroBtn} ${filtro === r ? styles.filtroBtnActive : ''}`}
            onClick={() => setFiltro(r)}
          >
            {r === 'todos' ? 'Todos' : ETIQUETA[r]}
          </button>
        ))}
      </div>

      {/* Filtros extra */}
      <div className={styles.filtrosExtras}>
        <div className={styles.busqueda}>
          <input
            className={styles.input}
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className={styles.filtroEstado}>
          <label className={styles.label}>Estado:</label>
          <select
            className={styles.input}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <div className={styles.filtroCiclo}>
          <label className={styles.label}>Ciclo:</label>
          <select
            className={styles.input}
            value={filtroCiclo}
            onChange={(e) => setFiltroCiclo(e.target.value)}
          >
            <option value="">Todos</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.activo ? '(Activo)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filtroSemestre}>
          <label className={styles.label}>Semestre:</label>
          <select
            className={styles.input}
            value={filtroSemestre}
            onChange={(e) => setFiltroSemestre(e.target.value)}
          >
            <option value="">Todos</option>
            {[1,2,3,4,5,6].map(s => (
              <option key={s} value={s}>{s}°</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroEspecialidad}>
          <label className={styles.label}>Especialidad:</label>
          <select
            className={styles.input}
            value={filtroEspecialidad}
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
          >
            <option value="">Todas</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroTurno}>
          <label className={styles.label}>Turno:</label>
          <select
            className={styles.input}
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
          >
            <option value="">Todos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div className={styles.filtroGrupo}>
          <label className={styles.label}>Grupo:</label>
          <select
            className={styles.input}
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
          >
            <option value="">Todos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Semestre / Grupo</th>
                <th className={styles.th}>Turno</th>
                <th className={styles.th}>Especialidad</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Registro</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4].map(row => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.userCell}>
                      <Skeleton width="36px" height="36px" variant="circle" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Skeleton width="140px" height="15px" variant="text" />
                        <Skeleton width="50px" height="11px" variant="text" />
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}><Skeleton width="160px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="70px" height="22px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="100px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="80px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="90px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="70px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="80px" height="15px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="70px" height="24px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : usuarios.length === 0 ? (
        <div className={styles.empty}>No hay usuarios en esta categoría.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Semestre / Grupo</th>
                <th className={styles.th}>Turno</th>
                <th className={styles.th}>Especialidad</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Registro</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={`${styles.tr} ${!u.activo ? styles.trInactivo : ''}`}>
                  <td className={styles.td}>
                    <div className={styles.userCell}>
                      <div className={`${styles.avatar} ${styles[`avatar_${COLOR_ROL[u.rol]}`]}`}>
                        {u.nombre?.charAt(0)}{u.apellidos?.charAt(0)}
                      </div>
                      <div>
                        <div className={styles.userName}>{u.apellidos}, {u.nombre}</div>
                        <div className={styles.userId}>ID #{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}><span className={styles.email}>{u.email}</span></td>
                  <td className={styles.td}>
                    <span className={`${styles.rolBadge} ${styles[`rol_${COLOR_ROL[u.rol]}`]}`}>
                      {ETIQUETA[u.rol]}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {u.rol === 'alumno' ? (
                      u.semestre ? getSemestreGrupo(u.semestre, u.grupo_nombre) : 'Sin asignar'
                    ) : '—'}
                  </td>
                  <td className={styles.td}>
                    {u.rol === 'alumno' ? (u.turno_nombre || 'Sin turno') : '—'}
                  </td>
                  <td className={styles.td}>
                    {u.rol === 'alumno' ? (u.especialidad_nombre || 'Sin especialidad') : '—'}
                  </td>
                  <td className={styles.td}>
                    <span className={u.activo ? styles.estadoActivo : styles.estadoInactivo}>
                      {u.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {new Date(u.fecha_registro).toLocaleDateString('es-MX')}
                  </td>
                  <td className={styles.td}>
                    <button className={styles.btnEditar} onClick={() => handleAbrirEditar(u)}>Editar</button>
                    {u.activo ? (
                      <button className={styles.btnDesactivar} onClick={() => handleDesactivar(u.id)}>Desactivar</button>
                    ) : (
                      <button className={styles.btnReactivar} onClick={() => handleReactivar(u.id)}>Reactivar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear usuario */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo usuario</h3>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre(s)</label>
                  <input
                    className={styles.input}
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    placeholder="Nombre(s)"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellidos</label>
                  <input
                    className={styles.input}
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    required
                    placeholder="Apellidos"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <input
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="correo@cecyte1.edu.mx"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Contraseña inicial</label>
                <input
                  className={styles.input}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Rol</label>
                <select
                  className={styles.input}
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                >
                  <option value="alumno">Alumno</option>
                  <option value="docente">Docente</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              {form.rol === 'alumno' && (
                <div className={styles.field}>
                  <label className={styles.label}>Matrícula</label>
                  <input
                    className={styles.input}
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    placeholder="Ej: A2024001 (opcional)"
                  />
                  <span className={styles.helpText}>Opcional: se generará automáticamente si se deja en blanco.</span>
                </div>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar usuario */}
      {modalEditarAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalEditarAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Editar usuario</h3>
            {errorEditar && <div className={styles.errorMsg}>{errorEditar}</div>}
            <form onSubmit={handleEditarUsuario} className={styles.form}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre(s)</label>
                  <input
                    className={styles.input}
                    value={formEditar.nombre}
                    onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellidos</label>
                  <input
                    className={styles.input}
                    value={formEditar.apellidos}
                    onChange={(e) => setFormEditar({ ...formEditar, apellidos: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <input
                  className={styles.input}
                  type="email"
                  value={formEditar.email}
                  onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña (opcional)</label>
                <input
                  className={styles.input}
                  type="password"
                  value={formEditar.password || ''}
                  onChange={(e) => setFormEditar({ ...formEditar, password: e.target.value })}
                  placeholder="Dejar en blanco para no cambiar"
                />
                <span className={styles.helpText}>Mínimo 8 caracteres. Solo se actualizará si se escribe algo.</span>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Rol</label>
                <select
                  className={styles.input}
                  value={formEditar.rol}
                  onChange={(e) => setFormEditar({ ...formEditar, rol: e.target.value })}
                >
                  <option value="alumno">Alumno</option>
                  <option value="docente">Docente</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Estado</label>
                <select
                  className={styles.input}
                  value={formEditar.activo ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormEditar({ ...formEditar, activo: e.target.value === 'true' })
                  }
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalEditarAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviandoEditar}>
                  {enviandoEditar ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}