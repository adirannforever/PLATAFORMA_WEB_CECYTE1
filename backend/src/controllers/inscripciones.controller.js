import { query, withTransaction } from '../config/db.js';
import { calcularCondicionAcademica } from './calificaciones.controller.js';

const verificarPeriodoActivo = async (ciclo_id, semestre, tipo_inscripcion) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const periodoRes = await query(
    `SELECT tipo, fecha_inicio, fecha_fin
     FROM periodos_escolares
     WHERE ciclo_id = $1 AND (semestre = $2 OR semestre IS NULL) AND tipo = $3 AND activo = TRUE
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
  fin.setHours(23, 59, 59, 999);

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
      `SELECT u.id, u.nombre, u.apellidos, u.email, a.matricula, a.id as alumno_id, a.semestre_actual, a.estatus
       FROM usuarios u
       JOIN alumnos a ON a.usuario_id = u.id
       WHERE u.rol = 'alumno' AND u.activo = TRUE
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
              e.nombre AS especialidad, e.clave AS especialidad_clave, t.nombre AS turno,
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

  const parsedAlumnoId = parseInt(alumno_id, 10);
  const parsedGrupoId = parseInt(grupo_id, 10);

  if (isNaN(parsedAlumnoId) || isNaN(parsedGrupoId) || parsedAlumnoId <= 0 || parsedGrupoId <= 0) {
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
      [parsedAlumnoId]
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
    const realAlumnoId = alumnoCheck.rows[0].alumno_id;

    const grupoRes = await query(
      `SELECT id, ciclo_id, semestre FROM grupos WHERE id = $1 AND activo = TRUE`,
      [parsedGrupoId]
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
      [realAlumnoId, ciclo_id]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este alumno ya está inscrito en un grupo en el ciclo actual.',
        code: 'ALUMNO_YA_INSCRITO'
      });
    }

    const tieneHistorial = await query(
      `SELECT id FROM historial_grupos_alumno WHERE alumno_id = $1`,
      [realAlumnoId]
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
    }

    const etapa = tipoEsperado === 'reinscripcion' ? 'reinscripcion' : 'inscripcion';
    const docsPendientes = await verificarDocumentosObligatorios(realAlumnoId, etapa);

    if (docsPendientes.total > 0 && req.user.rol !== 'administrador') {
      return res.status(400).json({
        success: false,
        message: `Faltan ${docsPendientes.total} documento(s) obligatorio(s) para ${etapa === 'reinscripcion' ? 'Reinscripción' : 'Inscripción'}.`,
        code: 'DOCUMENTOS_FALTANTES',
        documentos_faltantes: docsPendientes.documentos
      });
    }

    const resultadoInscripcion = await withTransaction(async (client) => {
      await client.query(
        'UPDATE alumnos SET grupo_actual_id = $1, semestre_actual = $2 WHERE id = $3',
        [parsedGrupoId, semestre, realAlumnoId]
      );

      const histRes = await client.query(
        `INSERT INTO historial_grupos_alumno (alumno_id, grupo_id, ciclo_id, semestre, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING *`,
        [realAlumnoId, parsedGrupoId, ciclo_id, semestre]
      );

      await client.query(
        `INSERT INTO auditoria_inscripciones (alumno_id, grupo_id, tipo, usuario_id, observaciones)
         VALUES ($1, $2, $3, $4, $5)`,
        [realAlumnoId, parsedGrupoId, tipoEsperado, req.user.id, `Inscripción manual en grupo ${parsedGrupoId} (semestre ${semestre})`]
      );

      return histRes.rows[0];
    });

    return res.status(201).json({
      success: true,
      message: `Alumno ${tipoEsperado === 'reinscripcion' ? 'reinscrito' : 'inscrito'} correctamente al grupo.`,
      inscripcion: resultadoInscripcion
    });

  } catch (err) {
    console.error('Error en inscribirAlumno:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al inscribir al alumno.',
      code: 'DB_ERROR'
    });
  }
};

// ============================================================
// PIPELINE DE REINSCRIPCIÓN DIGITAL (Cédula de Reinscripción)
// ============================================================

export const getEstatusReinscripcion = async (req, res) => {
  try {
    let alumnoId;

    if (req.user.rol === 'alumno') {
      const alumnoRes = await query('SELECT id FROM alumnos WHERE usuario_id = $1', [req.user.id]);
      if (!alumnoRes.rows[0]) {
        return res.status(404).json({ success: false, message: 'Perfil de alumno no encontrado.' });
      }
      alumnoId = alumnoRes.rows[0].id;
    } else {
      alumnoId = parseInt(req.query.alumno_id, 10);
      if (!alumnoId) {
        return res.status(400).json({ success: false, message: 'alumno_id es requerido para consulta administrativa.' });
      }
    }

    const cicloActivoRes = await query('SELECT * FROM ciclos_escolares WHERE activo = TRUE LIMIT 1');
    if (!cicloActivoRes.rows[0]) {
      return res.status(400).json({ success: false, message: 'No hay un ciclo escolar activo actualmente.' });
    }
    const cicloActivo = cicloActivoRes.rows[0];

    // Datos del alumno actual
    const alumnoInfo = await query(
      `SELECT a.id, a.matricula, a.semestre_actual, a.estatus, a.direccion,
              a.telefono_tutor, a.nombre_tutor, a.curp_tutor, a.especialidad_id,
              u.nombre, u.apellidos, u.email, u.telefono,
              e.nombre AS especialidad_nombre,
              g.id AS grupo_actual_id, g.nombre AS grupo_actual_nombre, g.letra AS grupo_actual_letra, g.turno_id
       FROM alumnos a
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN especialidades e ON e.id = a.especialidad_id
       LEFT JOIN grupos g ON g.id = a.grupo_actual_id
       WHERE a.id = $1`,
      [alumnoId]
    );

    if (!alumnoInfo.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }
    const alumno = alumnoInfo.rows[0];

    // Verificar si ya está inscrito en el ciclo activo
    const yaInscrito = await query(
      `SELECT h.id, g.id AS grupo_id, g.nombre AS grupo_nombre, g.semestre
       FROM historial_grupos_alumno h
       JOIN grupos g ON g.id = h.grupo_id
       WHERE h.alumno_id = $1 AND h.ciclo_id = $2 AND h.activo = TRUE`,
      [alumnoId, cicloActivo.id]
    );

    if (yaInscrito.rows.length > 0) {
      return res.json({
        success: true,
        ya_reinscrito: true,
        mensaje: 'Ya te encuentras formalmente reinscrito para este ciclo escolar.',
        grupo_asignado: yaInscrito.rows[0],
        ciclo: cicloActivo
      });
    }

    // Calcular condición académica
    const evaluacion = await calcularCondicionAcademica(alumnoId);
    const semestreSiguiente = (alumno.semestre_actual || 1) + 1;
    const periodoReinscripcion = await verificarPeriodoActivo(
      cicloActivo.id,
      semestreSiguiente,
      'reinscripcion'
    );

    // Buscar grupo sugerido para el siguiente semestre en el ciclo activo
    let grupoSugerido = null;
    if (semestreSiguiente <= 6 && alumno.especialidad_id) {
      const grupoSugeridoRes = await query(
        `SELECT g.id, g.nombre, g.semestre, g.letra, t.nombre AS turno
         FROM grupos g
         JOIN turnos t ON t.id = g.turno_id
         WHERE g.ciclo_id = $1 
           AND g.semestre = $2 
           AND g.especialidad_id = $3
           AND g.letra = $4
           AND g.turno_id = $5
           AND g.activo = TRUE
         LIMIT 1`,
        [cicloActivo.id, semestreSiguiente, alumno.especialidad_id, alumno.grupo_actual_letra || 'A', alumno.turno_id || 1]
      );
      grupoSugerido = grupoSugeridoRes.rows[0] || null;
    }

    return res.json({
      success: true,
      ya_reinscrito: false,
      alumno: {
        id: alumno.id,
        nombre_completo: `${alumno.nombre} ${alumno.apellidos}`,
        matricula: alumno.matricula,
        email: alumno.email,
        telefono: alumno.telefono,
        direccion: alumno.direccion,
        nombre_tutor: alumno.nombre_tutor,
        telefono_tutor: alumno.telefono_tutor,
        curp_tutor: alumno.curp_tutor,
        especialidad: alumno.especialidad_nombre,
        semestre_actual: alumno.semestre_actual,
        semestre_siguiente: semestreSiguiente <= 6 ? semestreSiguiente : null
      },
      ciclo: cicloActivo,
      evaluacion_academica: evaluacion,
      grupo_sugerido: grupoSugerido,
      periodo_reinscripcion: periodoReinscripcion,
      elegible: evaluacion ? evaluacion.elegible_reinscripcion : true,
      motivo_bloqueo: evaluacion ? evaluacion.motivo_no_elegible : null
    });
  } catch (err) {
    console.error('Error en getEstatusReinscripcion:', err);
    return res.status(500).json({ success: false, message: 'Error al verificar estatus de reinscripción.' });
  }
};

export const procesarCedulaReinscripcion = async (req, res) => {
  const {
    alumno_id,
    grupo_id,
    direccion,
    telefono_personal,
    nombre_tutor,
    telefono_tutor,
    curp_tutor
  } = req.body;

  try {
    if (!nombre_tutor || !telefono_tutor || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del tutor, su teléfono y la dirección son obligatorios para la reinscripción.'
      });
    }

    let targetAlumnoId;

    if (req.user.rol === 'alumno') {
      const alumnoRes = await query('SELECT id FROM alumnos WHERE usuario_id = $1', [req.user.id]);
      if (!alumnoRes.rows[0]) return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
      targetAlumnoId = alumnoRes.rows[0].id;
    } else {
      targetAlumnoId = parseInt(alumno_id, 10);
      if (!targetAlumnoId) return res.status(400).json({ success: false, message: 'alumno_id es requerido.' });
    }

    const cicloActivoRes = await query('SELECT id, nombre FROM ciclos_escolares WHERE activo = TRUE LIMIT 1');
    if (!cicloActivoRes.rows[0]) {
      return res.status(400).json({ success: false, message: 'No hay un ciclo escolar activo.' });
    }
    const cicloActivo = cicloActivoRes.rows[0];

    // Verificar si ya está reinscrito
    const yaInscrito = await query(
      `SELECT id FROM historial_grupos_alumno WHERE alumno_id = $1 AND ciclo_id = $2 AND activo = TRUE`,
      [targetAlumnoId, cicloActivo.id]
    );
    if (yaInscrito.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'El alumno ya se encuentra reinscrito en este ciclo.' });
    }

    const alumnoInfo = await query(
      `SELECT a.semestre_actual, a.especialidad_id, g.letra, g.turno_id
       FROM alumnos a
       LEFT JOIN grupos g ON g.id = a.grupo_actual_id
       WHERE a.id = $1`,
      [targetAlumnoId]
    );
    const aData = alumnoInfo.rows[0];
    if (!aData) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }

    const siguienteSemestre = Number(aData.semestre_actual || 1) + 1;
    if (siguienteSemestre > 6) {
      return res.status(400).json({
        success: false,
        message: 'El alumno ya cursa el último semestre y no requiere reinscripción.'
      });
    }

    if (req.user.rol !== 'administrador') {
      const periodo = await verificarPeriodoActivo(cicloActivo.id, siguienteSemestre, 'reinscripcion');
      if (!periodo.valido) {
        return res.status(400).json({
          success: false,
          code: 'PERIODO_INACTIVO',
          message: periodo.mensaje
        });
      }
    }

    // Verificar elegibilidad académica
    const evaluacion = await calcularCondicionAcademica(targetAlumnoId);
    if (evaluacion && !evaluacion.elegible_reinscripcion && req.user.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: evaluacion.motivo_no_elegible || 'No cumples con los requisitos académicos para avanzar de semestre.'
      });
    }

    const requestedGrupoId = grupo_id === undefined || grupo_id === null || grupo_id === ''
      ? null
      : Number(grupo_id);
    if (requestedGrupoId !== null && (!Number.isSafeInteger(requestedGrupoId) || requestedGrupoId <= 0)) {
      return res.status(400).json({ success: false, message: 'El grupo destino no es válido.' });
    }

    const groupValues = [
      cicloActivo.id,
      siguienteSemestre,
      aData.especialidad_id,
      aData.letra || 'A',
      aData.turno_id || 1
    ];
    let groupIdCondition = '';
    if (requestedGrupoId !== null) {
      groupValues.push(requestedGrupoId);
      groupIdCondition = ` AND id = $${groupValues.length}`;
    }
    const grupoInfo = await query(
      `SELECT id, nombre, semestre
       FROM grupos
       WHERE ciclo_id = $1 AND semestre = $2 AND especialidad_id = $3
         AND letra = $4 AND turno_id = $5 AND activo = TRUE${groupIdCondition}
       LIMIT 1`,
      groupValues
    );
    if (!grupoInfo.rows[0]) {
      return res.status(400).json({
        success: false,
        message: requestedGrupoId === null
          ? `No se encontró un grupo configurado para el semestre ${siguienteSemestre} en el ciclo activo. Contacta a Control Escolar.`
          : 'El grupo destino no corresponde al siguiente semestre del alumno o no está activo.'
      });
    }
    const targetGrupoId = grupoInfo.rows[0].id;
    const nuevoSemestre = grupoInfo.rows[0].semestre;

    const folioReinscripcion = `REINS-${cicloActivo.id}-${Date.now().toString().slice(-6)}`;

    // Transacción atómica de Reinscripción
    await withTransaction(async (client) => {
      await client.query('SELECT id FROM alumnos WHERE id = $1 FOR UPDATE', [targetAlumnoId]);
      const reinscripcionExistente = await client.query(
        `SELECT id
         FROM historial_grupos_alumno
         WHERE alumno_id = $1 AND ciclo_id = $2 AND activo = TRUE
         LIMIT 1`,
        [targetAlumnoId, cicloActivo.id]
      );
      if (reinscripcionExistente.rows[0]) {
        const conflict = new Error('El alumno ya se encuentra reinscrito en este ciclo.');
        conflict.code = 'REINSCRIPCION_DUPLICADA';
        throw conflict;
      }

      // 1. Actualizar datos de contacto y tutor en alumnos
      await client.query(
        `UPDATE alumnos 
         SET direccion = $1, telefono_tutor = $2, nombre_tutor = $3, curp_tutor = $4,
             grupo_actual_id = $5, semestre_actual = $6,
             estatus = $7
         WHERE id = $8`,
        [
          direccion.trim(),
          telefono_tutor.trim(),
          nombre_tutor.trim(),
          curp_tutor ? curp_tutor.trim().toUpperCase() : null,
          targetGrupoId,
          nuevoSemestre,
          evaluacion?.condicion === 'regular' ? 'activo' : 'irregular',
          targetAlumnoId
        ]
      );

      // 2. Si se proporcionó teléfono personal, actualizar usuario
      if (telefono_personal) {
        await client.query(
          `UPDATE usuarios SET telefono = $1 WHERE id = (SELECT usuario_id FROM alumnos WHERE id = $2)`,
          [telefono_personal.trim(), targetAlumnoId]
        );
      }

      // 3. Desactivar historiales anteriores
      await client.query(
        `UPDATE historial_grupos_alumno SET activo = FALSE WHERE alumno_id = $1`,
        [targetAlumnoId]
      );

      // 4. Insertar nuevo registro en historial
      await client.query(
        `INSERT INTO historial_grupos_alumno (alumno_id, grupo_id, ciclo_id, semestre, activo)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [targetAlumnoId, targetGrupoId, cicloActivo.id, nuevoSemestre]
      );

      // 5. Registrar auditoría formal
      await client.query(
        `INSERT INTO auditoria_inscripciones (alumno_id, grupo_id, tipo, usuario_id, observaciones)
         VALUES ($1, $2, 'reinscripcion', $3, $4)`,
        [
          targetAlumnoId,
          targetGrupoId,
          req.user.id,
          `Cédula digital completada. Folio: ${folioReinscripcion}. Promovido a semestre ${nuevoSemestre}`
        ]
      );
    });

    return res.status(201).json({
      success: true,
      message: 'Cédula de reinscripción procesada con éxito. Has sido reinscrito formalmente.',
      comprobante: {
        folio: folioReinscripcion,
        ciclo: cicloActivo.nombre,
        semestre: nuevoSemestre,
        grupo: grupoInfo.rows[0].nombre,
        fecha: new Date().toISOString()
      }
    });

  } catch (err) {
    if (err.code === 'REINSCRIPCION_DUPLICADA') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya se encuentra reinscrito en este ciclo.'
      });
    }
    console.error('Error en procesarCedulaReinscripcion:', err);
    return res.status(500).json({ success: false, message: 'Error interno al procesar la reinscripción.' });
  }
};

export const getControlEscolarDashboard = async (req, res) => {
  try {
    const cicloActivoRes = await query('SELECT id, nombre FROM ciclos_escolares WHERE activo = TRUE LIMIT 1');
    if (!cicloActivoRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'No hay ciclo escolar activo.' });
    }
    const cicloId = cicloActivoRes.rows[0].id;

    // Total alumnos registrados
    const totalAlumnosRes = await query("SELECT COUNT(*) AS total FROM alumnos WHERE estatus NOT IN ('baja_definitiva')");
    const totalAlumnos = parseInt(totalAlumnosRes.rows[0].total, 10);

    // Alumnos ya reinscritos en el ciclo activo
    const reinscritosRes = await query(
      `SELECT COUNT(DISTINCT alumno_id) AS total
       FROM historial_grupos_alumno
       WHERE ciclo_id = $1 AND activo = TRUE`,
      [cicloId]
    );
    const totalReinscritos = parseInt(reinscritosRes.rows[0].total, 10);

    // Desglose por estatus
    const estatusRes = await query(
      `SELECT estatus, COUNT(*) AS cantidad FROM alumnos GROUP BY estatus`
    );

    return res.json({
      success: true,
      ciclo_activo: cicloActivoRes.rows[0].nombre,
      metricas: {
        matricula_total: totalAlumnos,
        reinscritos_ciclo_actual: totalReinscritos,
        pendientes_reinscripcion: Math.max(0, totalAlumnos - totalReinscritos),
        desglose_estatus: estatusRes.rows
      }
    });
  } catch (err) {
    console.error('Error en getControlEscolarDashboard:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
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
              u.nombre, u.apellidos, u.email, a.matricula, a.estatus
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