import { useEffect, useState } from 'react';
import { usuariosService } from '../services/api';
import Skeleton from '../components/Skeleton'; // Importamos el componente Skeleton
import styles from './UsuariosPage.module.css';

const ROLES = ['todos', 'alumno', 'docente', 'administrador'];
const ETIQUETA = { alumno: 'Alumno', docente: 'Docente', administrador: 'Admin' };
const COLOR_ROL = { alumno: 'blue', docente: 'green', administrador: 'gold' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '', rol: 'alumno' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await usuariosService.getAll(filtro === 'todos' ? undefined : filtro);
      setUsuarios(res.data.usuarios);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [filtro]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await usuariosService.crear(form);
      setForm({ nombre: '', apellidos: '', email: '', password: '', rol: 'alumno' });
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear usuario.');
    } finally { setEnviando(false); }
  };

  const handleDesactivar = async (id) => {
    if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
    try {
      await usuariosService.desactivar(id);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al desactivar.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>{usuarios.length} usuario(s)</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setModalAbierto(true)}>
          + Nuevo usuario
        </button>
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

      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Registro</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Simulamos 4 filas de esqueleto para la tabla */}
              {[1, 2, 3, 4].map((row) => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.userCell} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Skeleton width="36px" height="36px" variant="circle" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Skeleton width="140px" height="15px" variant="text" />
                        <Skeleton width="50px" height="11px" variant="text" />
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <Skeleton width="160px" height="15px" variant="text" />
                  </td>
                  <td className={styles.td}>
                    <Skeleton width="70px" height="22px" variant="text" />
                  </td>
                  <td className={styles.td}>
                    <Skeleton width="60px" height="15px" variant="text" />
                  </td>
                  <td className={styles.td}>
                    <Skeleton width="80px" height="15px" variant="text" />
                  </td>
                  <td className={styles.td}>
                    <Skeleton width="70px" height="24px" variant="text" />
                  </td>
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
                    <span className={u.activo ? styles.estadoActivo : styles.estadoInactivo}>
                      {u.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.fecha}>
                      {new Date(u.fecha_registro).toLocaleDateString('es-MX')}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {u.activo && (
                      <button className={styles.btnDesactivar} onClick={() => handleDesactivar(u.id)}>
                        Desactivar
                      </button>
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
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo usuario</h3>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre(s)</label>
                  <input className={styles.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Nombre(s)" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellidos</label>
                  <input className={styles.input} value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} required placeholder="Apellidos" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <input className={styles.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="correo@cecyte1.edu.mx" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Contraseña inicial</label>
                <input className={styles.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Mínimo 8 caracteres" minLength={8} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Rol</label>
                <select className={styles.input} value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                  <option value="alumno">Alumno</option>
                  <option value="docente">Docente</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}