import { query } from '../config/db.js';





const verificarPeriodoActivo = async (ciclo_id, semestre, tipo_inscripcion) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const periodoRes = await query(
    `SELECT tipo, fecha_inicio, fecha_fin
     FROM periodos_escolares
     WHERE ciclo_id = $1 AND semestre = $2 AND tipo = $3 AND activo = TRUE
     ORDER BY fecha_inicio`,
    [ciclo_id, semestre, tipo_inscripcion]
  );

  if (!periodoRes.rows[0]) {
    return {
      valido: false,
      mensaje: `No hay período definido para ${tipo_inscripcion === 'reinscripcion' ? 'Reinscripción' : 'Inscripción de nuevo ingreso'} en este ciclo. Contacta al administrador.`
    };
  }

  const periodo = periodoRes.rows[0];
  const inicio = new Date(periodo.fecha_inicio);
  const fin = new Date(periodo.fecha_fin);
  inicio.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);

  if (hoy < inicio) {
    return {
      valido: false,
      mensaje: `El período de ${tipo_inscripcion === 'reinscripcion' ? 'Reinscripción' : 'Inscripción'} comienza el ${inicio.toLocaleDateString('es-MX')}. Aún no está disponible.`
    };
  }

  if (hoy > fin) {
    return {
      valido: false,
      mensaje: `El período de ${tipo_inscripcion === 'reinscripcion' ? 'Reinscripción' : 'Inscripción'} finalizó el ${fin.toLocaleDateString('es-MX')}. Ya no es posible inscribir.`
    };
  }

  return { valido: true };
};

const verificarDocumentosObligatorios = async (alumno_id, etapa) => {
  const pendientes = await query(
    `SELECT cd.id, cd.nombre
     FROM catalogo_documentos cd
     WHERE cd.etapa = $1 AND cd.obligatorio = TRUE
     AND NOT EXISTS (
       SELECT 1 FROM expediente_documentos ed
       WHERE ed.alumno_id = $2
         AND ed.documento_id = cd.id
         AND ed.entregado = TRUE
     )`,
    [etapa, alumno_id]
  );

  return {
    total: pendientes.rows.length,
    documentos: pendientes.rows.map(f => f.nombre)
  };
};





export const getAlumnosDisponibles = async (req, res) => {
  try {
    const cicloActivo = await query(
      'SELECT id FROM ciclos_escolares WHERE activo = TRUE LIMIT 1'
    );
    if (!cicloActivo.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'No hay un ciclo escolar activo. Contacta al administrador.',
        code: 'NO_CICLO_ACTIVO'
      });
    }
    const cicloId = cicloActivo.rows[0].id;

    const result = await query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, a.matricula
       FROM usuarios u
       JOIN alumnos a ON a.usuario_id = u.id
       WHERE u.rol = 'alumno' AND u.activo = TRUE AND a.estatus = 'activo'
         AND a.id NOT IN (
           SELECT alumno_id FROM historial_grupos_alumno
           WHERE ciclo_id = $1 AND activo = TRUE
         )
       ORDER BY u.apellidos, u.nombre`,
      [cicloId]
    );
    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error('Error en getAlumnosDisponibles:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};





export const getGruposDisponibles = async (req, res) => {
  try {
    const cicloActivo = await query(
      'SELECT id FROM ciclos_escolares WHERE activo = TRUE LIMIT 1'
    );
    if (!cicloActivo.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'No hay un ciclo escolar activo. Contacta al administrador.',
        code: 'NO_CICLO_ACTIVO'
      });
    }
    const cicloId = cicloActivo.rows[0].id;

    const result = await query(
      `SELECT g.id, g.nombre, g.semestre, g.letra,
              e.nombre AS especialidad, t.nombre AS turno,
              (SELECT COUNT(*) FROM historial_grupos_alumno WHERE grupo_id = g.id AND activo = TRUE) AS alumnos_actuales
       FROM grupos g
       JOIN especialidades e ON g.especialidad_id = e.id
       JOIN turnos t ON g.turno_id = t.id
       WHERE g.ciclo_id = $1 AND g.activo = TRUE
       ORDER BY g.semestre, g.letra`,
      [cicloId]
    );
    return res.json({ success: true, grupos: result.rows });
  } catch (err) {
    console.error('Error en getGruposDisponibles:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};





export const inscribirAlumno = async (req, res) => {
  const { alumno_id, grupo_id } = req.body;

  
  if (!alumno_id || !grupo_id) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id y grupo_id son requeridos.',
      code: 'CAMPOS_REQUERIDOS'
    });
  }

  if (isNaN(alumno_id) || isNaN(grupo_id) || parseInt(alumno_id) <= 0 || parseInt(grupo_id) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Los IDs deben ser números válidos.',
      code: 'ID_INVALIDO'
    });
  }

  try {
    
    const alumnoCheck = await query(
      `SELECT u.id AS usuario_id, u.activo, a.id AS alumno_id, a.estatus
       FROM usuarios u
       JOIN alumnos a ON a.usuario_id = u.id
       WHERE u.id = $1 AND u.rol = 'alumno'`,
      [alumno_id]
    );
    if (!alumnoCheck.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'El alumno seleccionado no existe o no tiene rol de alumno.',
        code: 'ALUMNO_NO_EXISTE'
      });
    }
    if (!alumnoCheck.rows[0].activo) {
      return res.status(400).json({
        success: false,
        message: 'El alumno está inactivo. No se puede inscribir.',
        code: 'ALUMNO_INACTIVO'
      });
    }
    const alumnoId = alumnoCheck.rows[0].alumno_id;

    
    const grupoRes = await query(
      `SELECT id, ciclo_id, semestre FROM grupos WHERE id = $1 AND activo = TRUE`,
      [grupo_id]
    );
    if (!grupoRes.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'El grupo seleccionado no existe o está inactivo.',
        code: 'GRUPO_NO_EXISTE'
      });
    }
    const { ciclo_id, semestre } = grupoRes.rows[0];

    
    const existe = await query(
      `SELECT id FROM historial_grupos_alumno
       WHERE alumno_id = $1 AND ciclo_id = $2 AND activo = TRUE`,
      [alumnoId, ciclo_id]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este alumno ya está inscrito en un grupo en el ciclo actual. Debes darlo de baja primero.',
        code: 'ALUMNO_YA_INSCRITO'
      });
    }

    
    const tieneHistorial = await query(
      `SELECT id FROM historial_grupos_alumno WHERE alumno_id = $1`,
      [alumnoId]
    );
    const tipoEsperado = tieneHistorial.rows.length > 0 ? 'reinscripcion' : 'inscripcion_nuevo_ingreso';

    if (req.user.rol !== 'administrador') {
      const periodoValido = await verificarPeriodoActivo(ciclo_id, semestre, tipoEsperado);
      if (!periodoValido.valido) {
        return res.status(400).json({
          success: false,
          message: periodoValido.mensaje,
          code: 'PERIODO_INACTIVO'
        });
      }
    } else {
      console.log(`Admin inscribiendo fuera de período (${tipoEsperado})`);
    }

    
    const etapa = tipoEsperado === 'reinscripcion' ? 'reinscripcion' : 'inscripcion';
    const docsPendientes = await verificarDocumentosObligatorios(alumnoId, etapa);

    if (docsPendientes.total > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan ${docsPendientes.total} documento(s) obligatorio(s) para ${etapa === 'reinscripcion' ? 'Reinscripción' : 'Inscripción'}.`,
        code: 'DOCUMENTOS_FALTANTES',
        documentos_faltantes: docsPendientes.documentos
      });
    }

    
    await query(
      'UPDATE alumnos SET grupo_actual_id = $1, semestre_actual = $2 WHERE id = $3',
      [grupo_id, semestre, alumnoId]
    );

    
    const result = await query(
      `INSERT INTO historial_grupos_alumno (alumno_id, grupo_id, ciclo_id, semestre, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [alumnoId, grupo_id, ciclo_id, semestre]
    );

    
    await query(
      `INSERT INTO auditoria_inscripciones (alumno_id, grupo_id, tipo, usuario_id, observaciones)
       VALUES ($1, $2, $3, $4, $5)`,
      [alumnoId, grupo_id, tipoEsperado, req.user.id, `Inscripción en grupo ${grupo_id} (semestre ${semestre})`]
    );

    return res.status(201).json({
      success: true,
      message: `Alumno ${tipoEsperado === 'reinscripcion' ? 'reinscrito' : 'inscrito'} correctamente al grupo.`,
      inscripcion: result.rows[0]
    });

  } catch (err) {
    console.error('Error en inscribirAlumno:', err);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Uno de los IDs proporcionados no es válido (alumno o grupo no existen).',
        code: 'FK_ERROR'
      });
    }
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya está inscrito en este grupo (duplicado).',
        code: 'DUPLICADO'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno al inscribir al alumno. Intenta de nuevo más tarde.',
      code: 'DB_ERROR'
    });
  }
};





export const getAlumnosDeGrupo = async (req, res) => {
  try {
    const { grupo_id } = req.params;

    if (!grupo_id || isNaN(grupo_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de grupo inválido.',
        code: 'ID_INVALIDO'
      });
    }

    const grupoExiste = await query('SELECT id FROM grupos WHERE id = $1', [grupo_id]);
    if (!grupoExiste.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'El grupo no existe.',
        code: 'GRUPO_NO_EXISTE'
      });
    }

    const result = await query(
      `SELECT h.id AS historial_id, a.id AS alumno_id, u.id AS usuario_id,
              u.nombre, u.apellidos, u.email, a.matricula
       FROM historial_grupos_alumno h
       JOIN alumnos a ON h.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE h.grupo_id = $1 AND h.activo = TRUE
       ORDER BY u.apellidos, u.nombre`,
      [grupo_id]
    );
    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error('Error en getAlumnosDeGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};





export const eliminarInscripcion = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de inscripción inválido.',
      code: 'ID_INVALIDO'
    });
  }

  try {
    const hist = await query(
      'SELECT id, alumno_id, grupo_id, ciclo_id FROM historial_grupos_alumno WHERE id = $1 AND activo = TRUE',
      [id]
    );
    if (!hist.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada o ya inactiva.',
        code: 'INSCRIPCION_NO_EXISTE'
      });
    }
    const { alumno_id, grupo_id, ciclo_id } = hist.rows[0];

    
    await query('UPDATE historial_grupos_alumno SET activo = FALSE WHERE id = $1', [id]);

    
    await query(
      'UPDATE alumnos SET grupo_actual_id = NULL, semestre_actual = NULL WHERE id = $1 AND grupo_actual_id = $2',
      [alumno_id, grupo_id]
    );

    
    await query(
      `INSERT INTO auditoria_inscripciones (alumno_id, grupo_id, tipo, usuario_id, observaciones)
       VALUES ($1, $2, 'baja', $3, $4)`,
      [alumno_id, grupo_id, req.user.id, `Baja del grupo ${grupo_id} (ciclo ${ciclo_id})`]
    );

    return res.json({
      success: true,
      message: 'Alumno dado de baja del grupo correctamente.'
    });
  } catch (err) {
    console.error('Error en eliminarInscripcion:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar la inscripción.',
      code: 'DB_ERROR'
    });
  }
};