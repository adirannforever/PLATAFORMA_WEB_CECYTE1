import { query, withTransaction } from '../config/db.js';
import {
  enviarInvitacionAspirante,
  prepararInvitacionAspirante,
  prepararNuevaInvitacionAspirante,
} from '../services/aspirantes-invitations.service.js';



export const getAspirantes = async (req, res) => {
  try {
    const { search, estatus, ciclo_id, especialidad_id, turno_id } = req.query;

    let sql = `
      SELECT a.*, 
             u.nombre AS especialidad_nombre,
             t.nombre AS turno_nombre,
             c.nombre AS ciclo_nombre,
             cuenta.activo AS cuenta_activa
      FROM aspirantes a
      LEFT JOIN especialidades u ON u.id = a.especialidad_id
      LEFT JOIN turnos t ON t.id = a.turno_preferido_id
      LEFT JOIN ciclos_escolares c ON c.id = a.ciclo_id
      LEFT JOIN usuarios cuenta ON cuenta.id = a.usuario_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (a.nombre ILIKE $${idx} OR a.apellidos ILIKE $${idx} OR a.email ILIKE $${idx} OR a.curp ILIKE $${idx} OR a.folio ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (estatus) {
      sql += ` AND a.estatus = $${idx}`;
      params.push(estatus);
      idx++;
    }

    if (ciclo_id) {
      sql += ` AND a.ciclo_id = $${idx}`;
      params.push(parseInt(ciclo_id));
      idx++;
    }

    if (especialidad_id) {
      sql += ` AND a.especialidad_id = $${idx}`;
      params.push(parseInt(especialidad_id));
      idx++;
    }

    if (turno_id) {
      sql += ` AND a.turno_preferido_id = $${idx}`;
      params.push(parseInt(turno_id));
      idx++;
    }

    sql += ' ORDER BY a.fecha_registro DESC';

    const result = await query(sql, params);
    return res.json({ success: true, aspirantes: result.rows });
  } catch (err) {
    console.error('Error en getAspirantes:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getMiAspirante = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.folio, a.nombre, a.apellidos, a.email, a.telefono, a.estatus, a.fecha_registro,
              e.nombre AS especialidad_nombre,
              t.nombre AS turno_nombre,
              c.nombre AS ciclo_nombre
       FROM aspirantes a
       LEFT JOIN especialidades e ON e.id = a.especialidad_id
       LEFT JOIN turnos t ON t.id = a.turno_preferido_id
       LEFT JOIN ciclos_escolares c ON c.id = a.ciclo_id
       WHERE a.usuario_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'No hay una solicitud de aspirante vinculada a esta cuenta.' });
    }
    return res.json({ success: true, aspirante: result.rows[0] });
  } catch (err) {
    console.error('Error en getMiAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno al consultar la solicitud.' });
  }
};





export const getAspirante = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, 
              u.nombre AS especialidad_nombre,
              t.nombre AS turno_nombre,
              c.nombre AS ciclo_nombre
       FROM aspirantes a
       LEFT JOIN especialidades u ON u.id = a.especialidad_id
       LEFT JOIN turnos t ON t.id = a.turno_preferido_id
       LEFT JOIN ciclos_escolares c ON c.id = a.ciclo_id
       WHERE a.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Aspirante no encontrado.' });
    }

    return res.json({ success: true, aspirante: result.rows[0] });
  } catch (err) {
    console.error('Error en getAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};





export const crearAspirante = async (req, res) => {
  const {
    nombre,
    apellidos,
    curp,
    email,
    telefono,
    especialidad_id,
    turno_preferido_id,
    ciclo_id,
    folio
  } = req.body;

  try {
    const folioFinal = folio || `ASP-${Date.now().toString().slice(-6)}`;
    const { aspirante, invitation } = await withTransaction(async (client) => {
      const existente = await client.query(
        'SELECT id FROM aspirantes WHERE LOWER(email) = LOWER($1) OR UPPER(curp) = UPPER($2) LIMIT 1',
        [email, curp]
      );
      if (existente.rows[0]) {
        const conflict = new Error('Ya existe un aspirante con este correo o CURP.');
        conflict.code = 'ASPIRANTE_DUPLICADO';
        throw conflict;
      }

      const result = await client.query(
        `INSERT INTO aspirantes
          (nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id, folio, estatus)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'registrado')
         RETURNING id, folio, nombre, apellidos, email, estatus`,
        [
          nombre.trim(),
          apellidos.trim(),
          curp.trim().toUpperCase(),
          email.trim().toLowerCase(),
          telefono?.trim() || null,
          especialidad_id,
          turno_preferido_id,
          ciclo_id,
          folioFinal.trim()
        ]
      );
      const createdApplicant = result.rows[0];
      const preparedInvitation = await prepararInvitacionAspirante(client, createdApplicant.id, req.user.id);
      return { aspirante: createdApplicant, invitation: preparedInvitation };
    });

    try {
      await enviarInvitacionAspirante(invitation);
    } catch (err) {
      console.error('Error enviando invitación de aspirante:', err);
      return res.status(502).json({
        success: false,
        code: 'INVITACION_NO_ENTREGADA',
        message: 'La solicitud fue registrada, pero no se pudo entregar la invitación. Usa “Reenviar acceso” cuando el correo esté disponible.',
        aspirante: { id: aspirante.id, folio: aspirante.folio }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Aspirante registrado. Se envió un enlace de activación de un solo uso al correo indicado.',
      aspirante
    });
  } catch (err) {
    if (err.code === 'ASPIRANTE_DUPLICADO' || err.code === 'CORREO_ASOCIADO') {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un aspirante o una cuenta con esos datos.' });
    }
    console.error('Error en crearAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const reenviarInvitacionAspirante = async (req, res) => {
  const aspiranteId = Number(req.params.id);
  if (!Number.isSafeInteger(aspiranteId) || aspiranteId <= 0) {
    return res.status(400).json({ success: false, message: 'Identificador de aspirante inválido.' });
  }

  try {
    const invitation = await prepararNuevaInvitacionAspirante(aspiranteId, req.user.id);
    await enviarInvitacionAspirante(invitation);
    return res.json({
      success: true,
      message: 'Se envió un nuevo enlace de activación. Los enlaces anteriores dejaron de ser válidos.'
    });
  } catch (err) {
    if (err.code === 'ASPIRANTE_NO_ENCONTRADO') {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (['CUENTA_NO_DISPONIBLE', 'CUENTA_YA_ACTIVA', 'CORREO_ASOCIADO'].includes(err.code)) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('Error reenviando invitación de aspirante:', err);
    return res.status(502).json({
      success: false,
      code: 'INVITACION_NO_ENTREGADA',
      message: err.message || 'No se pudo enviar la invitación. Verifica el servicio de correo e intenta de nuevo.'
    });
  }
};





export const actualizarEstatusAspirante = async (req, res) => {
  const { id } = req.params;
  const { estatus } = req.body;

  const estatusValidos = [
    'registrado',
    'documentos_pendientes',
    'ficha_pagada',
    'examen_aprobado',
    'aceptado',
    'rechazado',
    'inscrito'
  ];

  if (!estatus || !estatusValidos.includes(estatus)) {
    return res.status(400).json({
      success: false,
      message: `Estatus inválido. Valores permitidos: ${estatusValidos.join(', ')}`
    });
  }

  try {
    const result = await query(
      `UPDATE aspirantes SET estatus = $1 WHERE id = $2 RETURNING *`,
      [estatus, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Aspirante no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Estatus actualizado correctamente.',
      aspirante: result.rows[0]
    });
  } catch (err) {
    console.error('Error en actualizarEstatusAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};





export const convertirAspiranteEnAlumno = async (req, res) => {
  const { aspirante_id, grupo_id } = req.body;

  try {
    const aspiranteRes = await query(
      `SELECT * FROM aspirantes WHERE id = $1 AND estatus NOT IN ('inscrito', 'rechazado')`,
      [aspirante_id]
    );
    if (!aspiranteRes.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Aspirante no encontrado o ya procesado.'
      });
    }
    const aspirante = aspiranteRes.rows[0];
    if (!aspirante.usuario_id) {
      return res.status(409).json({
        success: false,
        message: 'El aspirante debe activar su cuenta antes de convertirlo. Reenvía la invitación desde su registro.'
      });
    }

    const grupoRes = await query(
      `SELECT id, ciclo_id, semestre
       FROM grupos
       WHERE id = $1 AND activo = TRUE AND ciclo_id = $2 AND especialidad_id = $3`,
      [grupo_id, aspirante.ciclo_id, aspirante.especialidad_id]
    );
    if (!grupoRes.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El grupo debe estar activo y corresponder al ciclo y especialidad del aspirante.'
      });
    }
    const { ciclo_id, semestre } = grupoRes.rows[0];

    const cicloRes = await query(
      `SELECT id FROM ciclos_escolares WHERE id = $1 AND activo = TRUE`,
      [ciclo_id]
    );
    if (!cicloRes.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El ciclo escolar no está activo. No se puede inscribir.'
      });
    }

    const year = new Date().getFullYear();
    const matricula = `${year}${String(aspirante.id).padStart(4, '0')}`;

    const { usuarioId, alumnoId } = await withTransaction(async (client) => {
      const aspiranteActual = await client.query(
        `SELECT estatus, usuario_id
         FROM aspirantes
         WHERE id = $1
         FOR UPDATE`,
        [aspirante_id]
      );
      if (!aspiranteActual.rows[0] || ['inscrito', 'rechazado'].includes(aspiranteActual.rows[0].estatus)) {
        const conflict = new Error('El aspirante ya fue procesado o no está disponible.');
        conflict.code = 'ASPIRANTE_YA_PROCESADO';
        throw conflict;
      }
      if (aspiranteActual.rows[0].usuario_id !== aspirante.usuario_id) {
        const conflict = new Error('La cuenta vinculada al aspirante cambió. Actualiza la página e inténtalo de nuevo.');
        conflict.code = 'CUENTA_ASPIRANTE_CAMBIO';
        throw conflict;
      }

      const accountResult = await client.query(
        `SELECT id
         FROM usuarios
         WHERE id = $1 AND rol = 'aspirante' AND activo = TRUE
         FOR UPDATE`,
        [aspirante.usuario_id]
      );
      if (!accountResult.rows[0]) {
        const conflict = new Error('El aspirante debe activar su cuenta antes de convertirlo.');
        conflict.code = 'CUENTA_ASPIRANTE_INACTIVA';
        throw conflict;
      }

      await client.query(
        `UPDATE usuarios
         SET rol = 'alumno', nombre = $1, apellidos = $2, telefono = $3
         WHERE id = $4`,
        [aspirante.nombre, aspirante.apellidos, aspirante.telefono || null, aspirante.usuario_id]
      );

      const alumnoResult = await client.query(
        `INSERT INTO alumnos (usuario_id, matricula, curp, especialidad_id, semestre_actual, estatus, fecha_ingreso)
         VALUES ($1, $2, $3, $4, $5, 'activo', CURRENT_DATE)
         RETURNING id`,
        [aspirante.usuario_id, matricula, aspirante.curp, aspirante.especialidad_id, semestre]
      );
      const nuevoAlumnoId = alumnoResult.rows[0].id;

      await client.query(
        `INSERT INTO historial_grupos_alumno (alumno_id, grupo_id, ciclo_id, semestre, activo)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [nuevoAlumnoId, grupo_id, ciclo_id, semestre]
      );
      await client.query(
        `UPDATE alumnos SET grupo_actual_id = $1 WHERE id = $2`,
        [grupo_id, nuevoAlumnoId]
      );
      await client.query(
        `UPDATE aspirantes SET estatus = 'inscrito' WHERE id = $1`,
        [aspirante_id]
      );

      return { usuarioId: aspirante.usuario_id, alumnoId: nuevoAlumnoId };
    });

    return res.status(201).json({
      success: true,
      message: 'Aspirante convertido a alumno exitosamente.',
      data: {
        usuario_id: usuarioId,
        alumno_id: alumnoId,
        matricula: matricula,
        grupo_id: grupo_id
      }
    });
  } catch (err) {
    if (err.code === 'ASPIRANTE_YA_PROCESADO' || err.code === 'CUENTA_ASPIRANTE_CAMBIO') {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.code === 'CUENTA_ASPIRANTE_INACTIVA') {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'La matrícula, correo o cuenta ya está en uso.' });
    }
    console.error('Error en convertirAspiranteEnAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno al convertir aspirante.' });
  }
};






export const getAspiranteById = getAspirante;
