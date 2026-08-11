import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';





export const getAspirantes = async (req, res) => {
  try {
    const { search, estatus, ciclo_id, especialidad_id, turno_id } = req.query;

    let sql = `
      SELECT a.*, 
             u.nombre AS especialidad_nombre,
             t.nombre AS turno_nombre,
             c.nombre AS ciclo_nombre
      FROM aspirantes a
      LEFT JOIN especialidades u ON u.id = a.especialidad_id
      LEFT JOIN turnos t ON t.id = a.turno_preferido_id
      LEFT JOIN ciclos_escolares c ON c.id = a.ciclo_id
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

  
  if (!nombre || !apellidos || !curp || !email || !especialidad_id || !turno_preferido_id || !ciclo_id) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos obligatorios son requeridos.'
    });
  }

  try {
    
    const existente = await query(
      `SELECT id FROM aspirantes WHERE email = $1 OR curp = $2`,
      [email, curp]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un aspirante con este correo o CURP.'
      });
    }

    
    const folioFinal = folio || `ASP-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO aspirantes 
        (nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id, folio, estatus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'registrado')
       RETURNING *`,
      [nombre, apellidos, curp, email, telefono || null, especialidad_id, turno_preferido_id, ciclo_id, folioFinal]
    );

    return res.status(201).json({
      success: true,
      message: 'Aspirante registrado correctamente.',
      aspirante: result.rows[0]
    });
  } catch (err) {
    console.error('Error en crearAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
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

  if (!aspirante_id || !grupo_id) {
    return res.status(400).json({
      success: false,
      message: 'aspirante_id y grupo_id son requeridos.'
    });
  }

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

    
    const grupoRes = await query(
      `SELECT id, ciclo_id, semestre FROM grupos WHERE id = $1 AND activo = TRUE`,
      [grupo_id]
    );
    if (!grupoRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado o inactivo.' });
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

    
    await query('BEGIN');

    
    const passwordHash = await bcrypt.hash('Aspirante2024', 12);
    const userResult = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo)
       VALUES ($1, $2, $3, $4, 'alumno', TRUE)
       RETURNING id`,
      [aspirante.nombre, aspirante.apellidos, aspirante.email, passwordHash]
    );
    const usuarioId = userResult.rows[0].id;

    
    const alumnoResult = await query(
      `INSERT INTO alumnos (usuario_id, matricula, especialidad_id, semestre_actual, estatus, fecha_ingreso)
       VALUES ($1, $2, $3, $4, 'activo', CURRENT_DATE)
       RETURNING id`,
      [usuarioId, matricula, aspirante.especialidad_id, semestre]
    );
    const alumnoId = alumnoResult.rows[0].id;

    
    await query(
      `INSERT INTO historial_grupos_alumno (alumno_id, grupo_id, ciclo_id, semestre, activo)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [alumnoId, grupo_id, ciclo_id, semestre]
    );

    
    await query(
      `UPDATE alumnos SET grupo_actual_id = $1 WHERE id = $2`,
      [grupo_id, alumnoId]
    );

    
    await query(
      `UPDATE aspirantes SET estatus = 'inscrito' WHERE id = $1`,
      [aspirante_id]
    );

    
    await query('COMMIT');

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
    await query('ROLLBACK');
    console.error('Error en convertirAspiranteEnAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno al convertir aspirante.' });
  }
};






export const getAspiranteById = getAspirante;