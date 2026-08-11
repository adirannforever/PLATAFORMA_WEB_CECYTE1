import { query } from '../config/db.js';

export const getExpedienteAlumno = async (req, res) => {
  const { alumno_id } = req.params;
  const { user } = req;

  try {
    // Validar acceso (admin o el propio alumno)
    if (user.rol === 'alumno') {
      const alumno = await query('SELECT id FROM alumnos WHERE usuario_id = $1', [user.id]);
      if (!alumno.rows[0] || alumno.rows[0].id !== parseInt(alumno_id)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado a este expediente.' });
      }
    } else if (user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Obtener el estado del proceso (usando la misma función del controlador de períodos)
    // Para evitar duplicar código, moveremos la lógica a un helper, pero por ahora la importamos directamente.
    // Aquí usamos la función que está en periodos.controller.js, pero como no podemos importar fácilmente,
    // la reescribimos inline o la extraemos a un helper.
    const estado = await obtenerEstadoAlumno(alumno_id);

    // Obtener documentos
    const sql = `
      SELECT 
        cd.id AS documento_id, 
        cd.clave, 
        cd.nombre AS documento_nombre, 
        cd.etapa, 
        cd.obligatorio,
        COALESCE(ed.entregado, FALSE) AS entregado,
        ed.fecha_entrega, 
        ed.observaciones,
        u.nombre || ' ' || u.apellidos AS recibido_por_nombre
      FROM catalogo_documentos cd
      LEFT JOIN expediente_documentos ed ON ed.documento_id = cd.id AND ed.alumno_id = $1
      LEFT JOIN usuarios u ON u.id = ed.recibido_por
      ORDER BY cd.etapa, cd.nombre
    `;

    const result = await query(sql, [alumno_id]);

    return res.json({
      success: true,
      data: result.rows,
      estado: estado
    });
  } catch (err) {
    console.error(' Error en getExpedienteAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Helper para obtener estado (copiado de periodos.controller.js pero como función interna)
const obtenerEstadoAlumno = async (alumno_id) => {
  const alumnoRes = await query(
    `SELECT a.semestre_actual, a.grupo_actual_id, a.estatus,
            g.ciclo_id, g.semestre AS grupo_semestre
     FROM alumnos a
     LEFT JOIN grupos g ON g.id = a.grupo_actual_id
     WHERE a.id = $1`,
    [alumno_id]
  );

  if (!alumnoRes.rows[0]) {
    throw new Error('Alumno no encontrado');
  }

  const { semestre_actual, estatus, grupo_semestre, ciclo_id } = alumnoRes.rows[0];
  const semestre = semestre_actual || grupo_semestre || 1;

  const periodosRes = await query(
    `SELECT tipo, fecha_inicio, fecha_fin
     FROM periodos_escolares
     WHERE ciclo_id = $1 AND semestre = $2 AND activo = TRUE
     ORDER BY fecha_inicio`,
    [ciclo_id, semestre]
  );

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let estado = 'inscripcion';
  let mensaje = 'El alumno está en proceso de Inscripción.';
  let etapaActual = 'inscripcion';
  let esEditable = true;

  for (const p of periodosRes.rows) {
    const inicio = new Date(p.fecha_inicio);
    const fin = new Date(p.fecha_fin);
    inicio.setHours(0,0,0,0);
    fin.setHours(0,0,0,0);

    if (hoy >= inicio && hoy <= fin) {
      estado = p.tipo;
      etapaActual = p.tipo;
      esEditable = true;
      const mensajes = {
        preinscripcion: 'Período de Preinscripción activo. Debes completar los documentos requeridos.',
        inscripcion_nuevo_ingreso: 'Período de Inscripción para nuevo ingreso activo. Entrega los documentos necesarios.',
        reinscripcion: 'Período de Reinscripción activo. Actualiza tus datos y entrega los documentos correspondientes.',
        inicio_semestre: 'El semestre ha iniciado. Verifica que tu documentación esté completa.',
        fin_semestre: 'Fin de semestre. Revisa tus calificaciones y documentos pendientes.',
        evaluaciones_parciales: 'Período de evaluaciones parciales. Entrega tus trabajos.',
        evaluacion_recuperacion: 'Período de recuperación. Asegúrate de cumplir con los requisitos.',
        evaluacion_extraordinaria: 'Período de extraordinarios. Entrega los documentos solicitados.',
        curso_intersemestral: 'Curso intersemestral activo. Completa tu inscripción.'
      };
      mensaje = mensajes[p.tipo] || mensaje;
      break;
    }
  }

  if (estado === 'inscripcion') {
    const reinscripcion = periodosRes.rows.find(p => p.tipo === 'reinscripcion');
    if (reinscripcion && new Date(reinscripcion.fecha_fin) < hoy) {
      estado = 'reinscripcion_cerrada';
      esEditable = false;
      mensaje = 'El período de Reinscripción ha finalizado. El alumno debe presentar documentos para el siguiente ciclo.';
    } else {
      mensaje = 'El alumno está en proceso de Inscripción. Entrega los documentos correspondientes.';
    }
  }

  if (semestre === 6 && estatus === 'activo') {
    estado = 'titulacion';
    mensaje = 'El alumno cursa el último semestre. Debe iniciar el proceso de Titulación.';
    esEditable = true;
  }

  if (estatus === 'egresado') {
    estado = 'egresado';
    mensaje = 'Alumno egresado. Ya no requiere inscripción ni reinscripción.';
    esEditable = false;
  }

  return {
    estado,
    mensaje,
    etapaActual,
    esEditable,
    semestre,
    periodos: periodosRes.rows
  };
};

export const actualizarDocumentoExpediente = async (req, res) => {
  const { alumno_id, documento_id, entregado, observaciones } = req.body;

  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ success: false, message: 'Acceso denegado.' });
  }

  try {
    const result = await query(
      `INSERT INTO expediente_documentos (alumno_id, documento_id, entregado, fecha_entrega, recibido_por, observaciones)
       VALUES ($1, $2, $3, CASE WHEN $3 = TRUE THEN CURRENT_DATE ELSE NULL END, $4, $5)
       ON CONFLICT (alumno_id, documento_id)
       DO UPDATE SET 
         entregado = EXCLUDED.entregado,
         fecha_entrega = EXCLUDED.fecha_entrega,
         recibido_por = EXCLUDED.recibido_por,
         observaciones = EXCLUDED.observaciones
       RETURNING *`,
      [alumno_id, documento_id, entregado, req.user.id, observaciones || null]
    );

    return res.json({
      success: true,
      message: 'Expediente actualizado.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(' Error en actualizarDocumentoExpediente:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getAlumnosConExpediente = async (req, res) => {
  const { search, etapa, adeuda } = req.query;

  try {
    let sql = `
      SELECT 
        a.id AS alumno_id, 
        u.id AS usuario_id, 
        u.nombre, 
        u.apellidos, 
        a.matricula,
        a.estatus AS alumno_estatus,
        (
          SELECT COUNT(*)
          FROM catalogo_documentos cd
          WHERE NOT EXISTS (
            SELECT 1
            FROM expediente_documentos ed
            WHERE ed.alumno_id = a.id
              AND ed.documento_id = cd.id
              AND ed.entregado = TRUE
          )
          ${etapa ? `AND cd.etapa = '${etapa}'` : ''}
          AND cd.obligatorio = TRUE
        ) AS documentos_pendientes
      FROM alumnos a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE u.activo = TRUE
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (u.nombre ILIKE $${paramIndex} OR u.apellidos ILIKE $${paramIndex} OR a.matricula ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (etapa) {
      sql += ` AND EXISTS (
        SELECT 1 
        FROM expediente_documentos ed
        JOIN catalogo_documentos cd ON cd.id = ed.documento_id
        WHERE ed.alumno_id = a.id 
          AND cd.etapa = $${paramIndex}
      )`;
      params.push(etapa);
      paramIndex++;
    }

    if (adeuda === 'true') {
      sql += ` AND (
        SELECT COUNT(*)
        FROM catalogo_documentos cd
        WHERE NOT EXISTS (
          SELECT 1
          FROM expediente_documentos ed
          WHERE ed.alumno_id = a.id
            AND ed.documento_id = cd.id
            AND ed.entregado = TRUE
        )
        ${etapa ? `AND cd.etapa = '${etapa}'` : ''}
        AND cd.obligatorio = TRUE
      ) > 0`;
    } else if (adeuda === 'false') {
      sql += ` AND (
        SELECT COUNT(*)
        FROM catalogo_documentos cd
        WHERE NOT EXISTS (
          SELECT 1
          FROM expediente_documentos ed
          WHERE ed.alumno_id = a.id
            AND ed.documento_id = cd.id
            AND ed.entregado = TRUE
        )
        ${etapa ? `AND cd.etapa = '${etapa}'` : ''}
        AND cd.obligatorio = TRUE
      ) = 0`;
    }

    sql += ' ORDER BY u.apellidos, u.nombre';

    const result = await query(sql, params);

    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error(' Error en getAlumnosConExpediente:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};