import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { reportesService, catalogosService, usuariosService, gruposService } from '../services/api';
import { downloadExcel, downloadPDF } from '../utils/downloadHelper';
import { FileText, Download, Users, BarChart3, CheckCircle, Search, X, Eye, Printer, Calendar, Filter } from 'lucide-react';
import styles from './ReportesPage.module.css';

export default function ReportesPage() {
  const { usuario } = useAuth();
  const { isAdmin, isDocente, isAlumno } = usePermissions();
  const [tabActiva, setTabActiva] = useState('boleta');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  
  const [visorPdf, setVisorPdf] = useState({
    open: false,
    blob: null,
    filename: '',
    tipo: '',
  });

  
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [nuevaTab, setNuevaTab] = useState(null);

  
  const [ciclos, setCiclos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [alumnoId, setAlumnoId] = useState('');
  const [cicloId, setCicloId] = useState('');

  
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [filtroGrupoAlumno, setFiltroGrupoAlumno] = useState('');
  const [filtroEspecialidadAlumno, setFiltroEspecialidadAlumno] = useState('');
  const [filtroSemestreAlumno, setFiltroSemestreAlumno] = useState('');
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);

  
  const [filtroParcial, setFiltroParcial] = useState([]);
  const [filtroTipoConstancia, setFiltroTipoConstancia] = useState('estudios');
  const [filtroIncluirParciales, setFiltroIncluirParciales] = useState({
    1: true,
    2: true,
    3: true,
  });

  
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  
  const [estadisticasCicloId, setEstadisticasCicloId] = useState('');
  const [estadisticasGrupoId, setEstadisticasGrupoId] = useState('');

  const letrasUnicas = useMemo(() => {
    const letras = grupos.map(g => g.letra).filter(Boolean);
    return [...new Set(letras)].sort();
  }, [grupos]);

  
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [ciclosRes, espRes] = await Promise.all([
          catalogosService.getCiclos(),
          catalogosService.getEspecialidades(),
        ]);
        setCiclos(ciclosRes.data || []);
        setEspecialidades(espRes.data || []);
        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo) {
          setCicloId(String(activo.id));
          setEstadisticasCicloId(String(activo.id));
        }

        if (isAlumno) {
          const alumnoData = {
            id: usuario.id,
            alumno_id: usuario.alumno_id || usuario.id,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            matricula: usuario.matricula || 'sin matrícula',
            semestre: usuario.semestre_actual || '',
            grupo_letra: usuario.grupo_letra || '',
            especialidad_nombre: usuario.especialidad_nombre || '',
          };
          setAlumnos([alumnoData]);
          setBusquedaAlumno(`${alumnoData.apellidos}, ${alumnoData.nombre} (${alumnoData.matricula})`);
          return;
        }

        const [gruposRes, alumnosRes] = await Promise.all([
          gruposService.getAll(),
          isAdmin ? usuariosService.getAll({ rol: 'alumno' }) : Promise.resolve({ usuarios: [] }),
        ]);
        setGrupos(gruposRes.data || []);
        setAlumnos(alumnosRes?.usuarios || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarCatalogos();
  }, [isAdmin, isDocente, isAlumno, usuario]);

  
  const buscarAlumnos = useCallback(async () => {
    if (isAlumno) return;
    setBuscandoAlumnos(true);
    try {
      const params = { rol: 'alumno' };
      if (busquedaAlumno) params.search = busquedaAlumno;
      if (filtroGrupoAlumno) params.grupo_letra = filtroGrupoAlumno;
      if (filtroEspecialidadAlumno) params.especialidad_id = filtroEspecialidadAlumno;
      if (filtroSemestreAlumno) params.semestre = filtroSemestreAlumno;
      const res = await usuariosService.getAll(params);
      setAlumnosFiltrados(res.usuarios || []);
    } catch (e) {
      console.error('Error buscando alumnos:', e);
    } finally {
      setBuscandoAlumnos(false);
    }
  }, [busquedaAlumno, filtroGrupoAlumno, filtroEspecialidadAlumno, filtroSemestreAlumno, isAlumno]);

  useEffect(() => {
    if (isAlumno) return;
    const handler = setTimeout(() => {
      if (busquedaAlumno || filtroGrupoAlumno || filtroEspecialidadAlumno || filtroSemestreAlumno) {
        buscarAlumnos();
      } else {
        setAlumnosFiltrados([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [busquedaAlumno, filtroGrupoAlumno, filtroEspecialidadAlumno, filtroSemestreAlumno, buscarAlumnos, isAlumno]);

  const seleccionarAlumno = (alumno) => {
    setAlumnoId(String(alumno.alumno_id || alumno.id));
    setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombre} (${alumno.matricula || 'sin matrícula'})`);
    setAlumnosFiltrados([]);
  };

  const limpiarBusquedaAlumno = () => {
    setBusquedaAlumno('');
    setAlumnoId('');
    setFiltroGrupoAlumno('');
    setFiltroEspecialidadAlumno('');
    setFiltroSemestreAlumno('');
    setAlumnosFiltrados([]);
  };

  
  const handleTabChange = (tabId) => {
    if (alumnoId && tabId !== tabActiva) {
      setNuevaTab(tabId);
      setMostrarConfirmacion(true);
    } else {
      setTabActiva(tabId);
      
      if (!alumnoId) {
        limpiarBusquedaAlumno();
      }
    }
  };

  const confirmarCambioTab = () => {
    limpiarBusquedaAlumno();
    setTabActiva(nuevaTab);
    setMostrarConfirmacion(false);
    setNuevaTab(null);
  };

  const cancelarCambioTab = () => {
    setMostrarConfirmacion(false);
    setNuevaTab(null);
  };

  
  const generarNombreArchivo = (tipo, params) => {
    const now = new Date();
    const timestamp =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0') +
      '_' +
      String(now.getHours()).padStart(2, '0') +
      '-' +
      String(now.getMinutes()).padStart(2, '0');

    let nombreAlumno = '';
    if (['boleta', 'constancia'].includes(tipo) && busquedaAlumno && !isAlumno) {
      const match = busquedaAlumno.match(/^([^\(]+)/);
      if (match) {
        nombreAlumno = match[1].trim().replace(/\s+/g, '_').replace(/,/g, '');
      }
    } else if (isAlumno && ['boleta', 'constancia'].includes(tipo)) {
      nombreAlumno = `${usuario.apellidos}_${usuario.nombre}`.replace(/\s+/g, '_').replace(/,/g, '');
    }

    const ext = tipo === 'listado' || tipo === 'estadisticas' ? 'xlsx' : 'pdf';
    if (nombreAlumno) {
      return `${tipo}_${nombreAlumno}_${timestamp}.${ext}`;
    }
    return `${tipo}_${timestamp}.${ext}`;
  };

  
  const handleGenerar = async (tipo, params) => {
    setCargando(true);
    setError('');
    try {
      let blob;
      let requestParams = { ...params };

      
      if (isAlumno && (tipo === 'boleta' || tipo === 'constancia')) {
        delete requestParams.alumno_id;
      }

      
      if (tipo === 'boleta') {
        const parcialesActivos = Object.keys(filtroIncluirParciales).filter(k => filtroIncluirParciales[k]);
        if (parcialesActivos.length > 0 && parcialesActivos.length < 3) {
          requestParams.parciales = parcialesActivos.join(',');
        }
      }

      if (tipo === 'constancia') {
        if (filtroTipoConstancia) requestParams.tipo_constancia = filtroTipoConstancia;
      }

      switch (tipo) {
        case 'boleta':
          blob = await reportesService.generarBoleta(requestParams);
          break;
        case 'constancia':
          blob = await reportesService.generarConstancia(requestParams);
          break;
        case 'listado':
          blob = await reportesService.generarListadoAlumnos(requestParams);
          break;
        case 'estadisticas':
          blob = await reportesService.generarEstadisticas(requestParams);
          break;
        default:
          throw new Error('Tipo de reporte inválido');
      }

      const filename = generarNombreArchivo(tipo, requestParams);

      if (tipo === 'boleta' || tipo === 'constancia') {
        setVisorPdf({
          open: true,
          blob,
          filename,
          tipo,
        });
        setExito(`Reporte generado: ${filename}`);
        setTimeout(() => setExito(''), 4000);
      } else {
        if (tipo === 'listado' || tipo === 'estadisticas') {
          downloadExcel(blob, filename.replace(/\.[^.]+$/, ''));
        } else {
          downloadPDF(blob, filename.replace(/\.[^.]+$/, ''));
        }
        setExito(`Reporte descargado: ${filename}`);
        setTimeout(() => setExito(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  };

  
  const descargarDesdeVisor = () => {
    if (!visorPdf.blob) return;
    downloadPDF(visorPdf.blob, visorPdf.filename.replace(/\.[^.]+$/, ''));
  };

  const imprimirDesdeVisor = () => {
    if (!visorPdf.blob) return;
    const url = window.URL.createObjectURL(visorPdf.blob);
    const ventana = window.open(url, '_blank');
    if (ventana) {
      ventana.focus();
      ventana.print();
    }
  };

  const cerrarVisor = () => {
    if (visorPdf.blob) {
      URL.revokeObjectURL(URL.createObjectURL(visorPdf.blob));
    }
    setVisorPdf({ open: false, blob: null, filename: '', tipo: '' });
  };

  
  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'boleta', label: 'Boleta', icon: <FileText size={16} /> },
      { id: 'constancia', label: 'Constancia', icon: <FileText size={16} /> },
    ];
    if (isAdmin || isDocente) {
      allTabs.push({ id: 'listado', label: 'Listado de alumnos', icon: <Users size={16} /> });
    }
    if (isAdmin) {
      allTabs.push({ id: 'estadisticas', label: 'Estadísticas', icon: <BarChart3 size={16} /> });
    }
    return allTabs;
  }, [isAdmin, isDocente]);

  useEffect(() => {
    const tabIds = tabs.map(t => t.id);
    if (!tabIds.includes(tabActiva)) {
      setTabActiva(tabIds[0] || 'boleta');
    }
  }, [tabs, tabActiva]);

  
  
  
  const renderBoleta = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        {/* Buscador de alumno (igual que antes) */}
        <div className={styles.field}>
          <label className={styles.label}>
            {isAlumno ? 'Alumno' : 'Buscar alumno'} <span className={styles.required}>*</span>
          </label>
          {isAlumno ? (
            <div className={styles.alumnoFijo}>
              {alumnos.length > 0 ? `${alumnos[0].apellidos}, ${alumnos[0].nombre}` : 'Cargando...'}
            </div>
          ) : (
            <div className={styles.alumnoSearchContainer}>
              {/* ... código de búsqueda (igual que antes) ... */}
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.inputSearch}
                  placeholder="Buscar por nombre, apellido o matrícula..."
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                />
                {busquedaAlumno && (
                  <button className={styles.clearBtn} onClick={limpiarBusquedaAlumno}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className={styles.filtrosAlumno}>
                <select
                  className={styles.selectSmall}
                  value={filtroGrupoAlumno}
                  onChange={(e) => setFiltroGrupoAlumno(e.target.value)}
                >
                  <option value="">Todos los grupos</option>
                  {letrasUnicas.map((letra) => (
                    <option key={letra} value={letra}>Grupo {letra}</option>
                  ))}
                </select>
                <select
                  className={styles.selectSmall}
                  value={filtroEspecialidadAlumno}
                  onChange={(e) => setFiltroEspecialidadAlumno(e.target.value)}
                >
                  <option value="">Todas las especialidades</option>
                  {especialidades.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                <select
                  className={styles.selectSmall}
                  value={filtroSemestreAlumno}
                  onChange={(e) => setFiltroSemestreAlumno(e.target.value)}
                >
                  <option value="">Todos los semestres</option>
                  {[1,2,3,4,5,6].map((s) => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
                <button
                  className={styles.btnBuscar}
                  onClick={buscarAlumnos}
                  disabled={buscandoAlumnos}
                >
                  {buscandoAlumnos ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {alumnosFiltrados.length > 0 && (
                <div className={styles.resultadosAlumnos}>
                  {alumnosFiltrados.map((a) => (
                    <div
                      key={a.id}
                      className={styles.resultadoAlumno}
                      onClick={() => seleccionarAlumno(a)}
                    >
                      <span><strong>{a.apellidos}, {a.nombre}</strong></span>
                      <span className={styles.resultadoDetalle}>
                        {a.matricula || 'sin matrícula'} • {a.semestre ? `${a.semestre}°` : '—'} • Grupo {a.grupo_letra || '—'} • {a.especialidad_nombre || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {alumnoId && busquedaAlumno && (
                <div className={styles.alumnoSeleccionado}>
                  <span>Alumno seleccionado: <strong>{busquedaAlumno}</strong></span>
                  <button className={styles.btnQuitar} onClick={limpiarBusquedaAlumno}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ciclo (igual que antes) */}
        <div className={styles.field}>
          <label className={styles.label}>Ciclo escolar <span className={styles.required}>*</span></label>
          <select
            className={styles.select}
            value={cicloId}
            onChange={(e) => setCicloId(e.target.value)}
          >
            <option value="">Seleccionar ciclo...</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.activo ? '(Activo)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ===== FILTROS AVANZADOS (BOLETA) ===== */}
        <div className={styles.filtrosAvanzados}>
          <div className={styles.filtrosGridAvanzado}>
            <div className={styles.field}>
              <label className={styles.label}>Incluir parciales</label>
              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={filtroIncluirParciales[1]}
                    onChange={(e) => setFiltroIncluirParciales({ ...filtroIncluirParciales, 1: e.target.checked })}
                  /> Parcial 1
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filtroIncluirParciales[2]}
                    onChange={(e) => setFiltroIncluirParciales({ ...filtroIncluirParciales, 2: e.target.checked })}
                  /> Parcial 2
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filtroIncluirParciales[3]}
                    onChange={(e) => setFiltroIncluirParciales({ ...filtroIncluirParciales, 3: e.target.checked })}
                  /> Parcial 3
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const params = { ciclo_id: cicloId };
              if (!isAlumno && alumnoId) {
                params.alumno_id = alumnoId;
              }
              handleGenerar('boleta', params);
            }}
            disabled={(!isAlumno && !alumnoId) || !cicloId || cargando}
          >
            <Eye size={16} /> {cargando ? 'Generando...' : 'Ver PDF'}
          </button>
          {((!isAlumno && alumnoId) || isAlumno) && cicloId && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Listo para generar
            </span>
          )}
        </div>
      </div>
    </div>
  );

  
  
  
  const renderConstancia = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        {/* Buscador de alumno (igual que boleta) */}
        <div className={styles.field}>
          <label className={styles.label}>
            {isAlumno ? 'Alumno' : 'Buscar alumno'} <span className={styles.required}>*</span>
          </label>
          {isAlumno ? (
            <div className={styles.alumnoFijo}>
              {alumnos.length > 0 ? `${alumnos[0].apellidos}, ${alumnos[0].nombre}` : 'Cargando...'}
            </div>
          ) : (
            <div className={styles.alumnoSearchContainer}>
              {/* ... mismo código de búsqueda que en boleta ... */}
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.inputSearch}
                  placeholder="Buscar por nombre, apellido o matrícula..."
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                />
                {busquedaAlumno && (
                  <button className={styles.clearBtn} onClick={limpiarBusquedaAlumno}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className={styles.filtrosAlumno}>
                <select
                  className={styles.selectSmall}
                  value={filtroGrupoAlumno}
                  onChange={(e) => setFiltroGrupoAlumno(e.target.value)}
                >
                  <option value="">Todos los grupos</option>
                  {letrasUnicas.map((letra) => (
                    <option key={letra} value={letra}>Grupo {letra}</option>
                  ))}
                </select>
                <select
                  className={styles.selectSmall}
                  value={filtroEspecialidadAlumno}
                  onChange={(e) => setFiltroEspecialidadAlumno(e.target.value)}
                >
                  <option value="">Todas las especialidades</option>
                  {especialidades.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                <select
                  className={styles.selectSmall}
                  value={filtroSemestreAlumno}
                  onChange={(e) => setFiltroSemestreAlumno(e.target.value)}
                >
                  <option value="">Todos los semestres</option>
                  {[1,2,3,4,5,6].map((s) => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
                <button
                  className={styles.btnBuscar}
                  onClick={buscarAlumnos}
                  disabled={buscandoAlumnos}
                >
                  {buscandoAlumnos ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {alumnosFiltrados.length > 0 && (
                <div className={styles.resultadosAlumnos}>
                  {alumnosFiltrados.map((a) => (
                    <div
                      key={a.id}
                      className={styles.resultadoAlumno}
                      onClick={() => seleccionarAlumno(a)}
                    >
                      <span><strong>{a.apellidos}, {a.nombre}</strong></span>
                      <span className={styles.resultadoDetalle}>
                        {a.matricula || 'sin matrícula'} • {a.semestre ? `${a.semestre}°` : '—'} • Grupo {a.grupo_letra || '—'} • {a.especialidad_nombre || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {alumnoId && busquedaAlumno && (
                <div className={styles.alumnoSeleccionado}>
                  <span>Alumno seleccionado: <strong>{busquedaAlumno}</strong></span>
                  <button className={styles.btnQuitar} onClick={limpiarBusquedaAlumno}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== FILTROS AVANZADOS (CONSTANCIA) ===== */}
        <div className={styles.filtrosAvanzados}>
          <div className={styles.filtrosGridAvanzado}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo de constancia</label>
              <select
                className={styles.select}
                value={filtroTipoConstancia}
                onChange={(e) => setFiltroTipoConstancia(e.target.value)}
              >
                <option value="estudios">Estudios</option>
                <option value="conducta">Buena conducta</option>
                <option value="beca">Para beca</option>
                <option value="trabajo">Para trabajo</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const params = {};
              if (!isAlumno && alumnoId) {
                params.alumno_id = alumnoId;
              }
              handleGenerar('constancia', params);
            }}
            disabled={(!isAlumno && !alumnoId) || cargando}
          >
            <Eye size={16} /> {cargando ? 'Generando...' : 'Ver PDF'}
          </button>
          {((!isAlumno && alumnoId) || isAlumno) && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Listo para generar
            </span>
          )}
        </div>
      </div>
    </div>
  );

  
  
  
  const renderListado = () => {
    if (!isAdmin && !isDocente) return null;
    return (
      <div className={styles.tabContent}>
        <div className={styles.reportCard}>
          <div className={styles.filtrosGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Grupo</label>
              <select
                className={styles.select}
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
              >
                <option value="">Todos</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Especialidad</label>
              <select
                className={styles.select}
                value={filtroEspecialidad}
                onChange={(e) => setFiltroEspecialidad(e.target.value)}
              >
                <option value="">Todas</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Semestre</label>
              <select
                className={styles.select}
                value={filtroSemestre}
                onChange={(e) => setFiltroSemestre(e.target.value)}
              >
                <option value="">Todos</option>
                {[1,2,3,4,5,6].map((s) => (
                  <option key={s} value={s}>{s}°</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Estatus</label>
              <select
                className={styles.select}
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="baja_temporal">Baja temporal</option>
                <option value="baja_definitiva">Baja definitiva</option>
                <option value="egresado">Egresado</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                const params = {};
                if (filtroGrupo) params.grupo_id = filtroGrupo;
                if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
                if (filtroSemestre) params.semestre = filtroSemestre;
                if (filtroEstatus) params.estatus = filtroEstatus;
                handleGenerar('listado', params);
              }}
              disabled={cargando}
            >
              <Download size={16} /> {cargando ? 'Generando...' : 'Generar Excel'}
            </button>
            {(filtroGrupo || filtroEspecialidad || filtroSemestre || filtroEstatus) && (
              <span className={styles.helpText}>
                <CheckCircle size={14} /> Filtros aplicados
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  
  
  
  const renderEstadisticas = () => {
    if (!isAdmin) return null;
    return (
      <div className={styles.tabContent}>
        <div className={styles.reportCard}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Ciclo escolar <span className={styles.required}>*</span></label>
              <select
                className={styles.select}
                value={estadisticasCicloId}
                onChange={(e) => setEstadisticasCicloId(e.target.value)}
              >
                <option value="">Seleccionar ciclo...</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.activo ? '(Activo)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Grupo (opcional)</label>
              <select
                className={styles.select}
                value={estadisticasGrupoId}
                onChange={(e) => setEstadisticasGrupoId(e.target.value)}
              >
                <option value="">Todos</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                const params = { ciclo_id: estadisticasCicloId };
                if (estadisticasGrupoId) params.grupo_id = estadisticasGrupoId;
                handleGenerar('estadisticas', params);
              }}
              disabled={!estadisticasCicloId || cargando}
            >
              <Download size={16} /> {cargando ? 'Generando...' : 'Generar Excel'}
            </button>
            {estadisticasCicloId && (
              <span className={styles.helpText}>
                <CheckCircle size={14} /> Listo para generar
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  
  
  
  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>
            {isAlumno
              ? 'Genera tus reportes académicos'
              : isDocente
              ? 'Genera reportes de tus alumnos y grupos'
              : 'Genera reportes académicos'}
          </p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${tabActiva === tab.id ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContentWrapper}>
        {tabActiva === 'boleta' && renderBoleta()}
        {tabActiva === 'constancia' && renderConstancia()}
        {tabActiva === 'listado' && renderListado()}
        {tabActiva === 'estadisticas' && renderEstadisticas()}
      </div>

      {/* ===== MODAL DE CONFIRMACIÓN ===== */}
      {mostrarConfirmacion && (
        <div className={styles.modalOverlay} onClick={cancelarCambioTab}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>¿Cambiar de sección?</h3>
            <p className={styles.confirmText}>
              El alumno seleccionado se perderá. ¿Deseas continuar?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={cancelarCambioTab}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={confirmarCambioTab}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VISOR PDF ===== */}
      {visorPdf.open && visorPdf.blob && (
        <div className={styles.modalOverlay} onClick={cerrarVisor}>
          <div className={styles.visorModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.visorHeader}>
              <h3 className={styles.visorTitle}>
                <FileText size={18} /> {visorPdf.tipo === 'boleta' ? 'Boleta de calificaciones' : 'Constancia de estudios'}
              </h3>
              <div className={styles.visorActions}>
                <button className={styles.visorBtn} onClick={imprimirDesdeVisor} title="Imprimir">
                  <Printer size={16} />
                </button>
                <button className={styles.visorBtn} onClick={descargarDesdeVisor} title="Descargar">
                  <Download size={16} />
                </button>
                <button className={styles.visorBtnClose} onClick={cerrarVisor} title="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className={styles.visorBody}>
              <iframe
                src={URL.createObjectURL(visorPdf.blob)}
                className={styles.visorIframe}
                title="Visor PDF"
                frameBorder="0"
              />
            </div>
            <div className={styles.visorFooter}>
              <span className={styles.visorFilename}>{visorPdf.filename}</span>
              <button className={styles.visorBtnCerrar} onClick={cerrarVisor}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}