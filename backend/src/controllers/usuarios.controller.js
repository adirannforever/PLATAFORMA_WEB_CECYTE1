import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

export const getUsuarios = async (req, res) => {
  try {
    const {
      rol,
      search,
      activo,
      ciclo_id,
      semestre,
      especialidad_id,
      turno_id,
      grupo_id,
      grupo_letra,
      docente_id,
    } = req.query;

    const userRole = req.user.rol;
    const userId = req.user.id;

    
    let sql = `
      SELECT 
        u.id,
        u.nombre, u.apellidos, u.email, u.rol, u.activo, u.fecha_registro,
        a.id AS alumno_id,
        a.semestre_actual AS semestre,
        a.especialidad_id AS alumno_especialidad_id,
        a.grupo_actual_id,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra,
        t.id AS turno_id,
        t.nombre AS turno_nombre,
        e.id AS especialidad_catalogo_id,
        e.nombre AS especialidad_nombre,
        a.matricula
      FROM usuarios u
      LEFT JOIN alumnos a ON a.usuario_id = u.id
      LEFT JOIN grupos g ON g.id = a.grupo_actual_id
      LEFT JOIN turnos t ON t.id = g.turno_id
      LEFT JOIN especialidades e ON e.id = g.especialidad_id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    
    if (userRole === 'docente' && rol === 'alumno') {
      const docenteId = docente_id || userId;
      conditions.push(`a.grupo_actual_id IN (
        SELECT DISTINCT mg.grupo_id 
        FROM materias_grupo mg 
        WHERE mg.docente_id = $${params.length + 1} AND mg.activa = true
      )`);
      params.push(docenteId);
    }

    if (rol) {
      conditions.push(`u.rol = $${params.length + 1}`);
      params.push(rol);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(`(u.nombre ILIKE $${params.length + 1} OR u.apellidos ILIKE $${params.length + 1} OR a.matricula ILIKE $${params.length + 1})`);
      params.push(searchTerm);
    }

    
    if (activo !== undefined) {
      conditions.push(`u.activo = $${params.length + 1}`);
      params.push(activo === 'true');
    }
    

    if (semestre) {
      conditions.push(`a.semestre_actual = $${params.length + 1}`);
      params.push(parseInt(semestre));
    }

    if (especialidad_id) {
      conditions.push(`g.especialidad_id = $${params.length + 1}`);
      params.push(parseInt(especialidad_id));
    }

    if (turno_id) {
      conditions.push(`g.turno_id = $${params.length + 1}`);
      params.push(parseInt(turno_id));
    }

    if (grupo_id) {
      conditions.push(`a.grupo_actual_id = $${params.length + 1}`);
      params.push(parseInt(grupo_id));
    }

    if (grupo_letra) {
      conditions.push(`g.letra = $${params.length + 1}`);
      params.push(grupo_letra.toUpperCase());
    }

    
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY u.apellidos, u.nombre';

    const result = await query(sql, params);
    return res.json({ success: true, usuarios: result.rows });
  } catch (err) {
    console.error('Error en getUsuarios:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener usuarios.',
      error: err.message,
    });
  }
};

export const getUsuarioById = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, apellidos, email, rol, activo, fecha_registro FROM usuarios WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, usuario: result.rows[0] });
  } catch (err) {
    console.error('Error en getUsuarioById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearUsuario = async (req, res) => {
  const { nombre, apellidos, email, password, rol, matricula } = req.body;

  if (!nombre || !apellidos || !email || !password || !rol) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos obligatorios son requeridos: nombre, apellidos, email, password, rol.',
    });
  }

  const rolesValidos = ['alumno', 'docente', 'administrador'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({
      success: false,
      message: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}`,
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
  }

  try {
    await query('BEGIN');

    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, apellidos, email, rol`,
      [nombre.trim(), apellidos.trim(), email.toLowerCase().trim(), hash, rol]
    );

    const nuevoUsuario = result.rows[0];

    if (rol === 'alumno') {
      const matriculaFinal =
        matricula && matricula.trim() !== ''
          ? matricula.trim()
          : `A${String(nuevoUsuario.id).padStart(4, '0')}`;

      await query(
        `INSERT INTO alumnos (usuario_id, matricula, estatus) VALUES ($1, $2, 'activo')`,
        [nuevoUsuario.id, matriculaFinal]
      );
    }

    await query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente.',
      usuario: nuevoUsuario,
    });
  } catch (err) {
    await query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese correo electrónico o matrícula.',
      });
    }
    console.error('Error en crearUsuario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarUsuario = async (req, res) => {
  const { nombre, apellidos, email, rol, activo } = req.body;
  const { id } = req.params;

  try {
    if (rol) {
      const rolesValidos = ['alumno', 'docente', 'administrador'];
      if (!rolesValidos.includes(rol)) {
        return res.status(400).json({
          success: false,
          message: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}`,
        });
      }
    }

    const result = await query(
      `UPDATE usuarios
       SET nombre    = COALESCE($1, nombre),
           apellidos = COALESCE($2, apellidos),
           email     = COALESCE($3, email),
           rol       = COALESCE($4, rol),
           activo    = COALESCE($5, activo)
       WHERE id = $6
       RETURNING id, nombre, apellidos, email, rol, activo`,
      [nombre, apellidos, email?.toLowerCase().trim(), rol, activo, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Usuario actualizado.',
      usuario: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'El email ya está en uso.' });
    }
    console.error('Error en actualizarUsuario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const desactivarUsuario = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'No puedes desactivar tu propia cuenta.',
    });
  }

  try {
    const result = await query(
      'UPDATE usuarios SET activo = FALSE WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, message: 'Usuario desactivado.' });
  } catch (err) {
    console.error('Error en desactivarUsuario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ACTUALIZAR CONTRASEÑA (solo administradores)
// ============================================================
export const actualizarPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  // Validar que el usuario autenticado sea administrador
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para cambiar contraseñas de otros usuarios.',
    });
  }

  // Validar que se envió una contraseña
  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
  }

  try {
    // Verificar que el usuario existe
    const userExists = await query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );
    if (!userExists.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
    }

    // Generar hash de la nueva contraseña
    const hash = await bcrypt.hash(password, 12);

    // Actualizar la contraseña
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [hash, id]
    );

    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (err) {
    console.error('Error en actualizarPassword:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar la contraseña.',
    });
  }
};