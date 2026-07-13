import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

export const getUsuarios = async (req, res) => {
  try {
    const { rol } = req.query;
    let sql = 'SELECT id, nombre, apellidos, email, rol, activo, fecha_registro FROM usuarios';
    const params = [];

    if (rol) {
      sql += ' WHERE rol = $1';
      params.push(rol);
    }

    sql += ' ORDER BY apellidos, nombre';

    const result = await query(sql, params);
    return res.json({ success: true, usuarios: result.rows });
  } catch (err) {
    console.error('Error en getUsuarios:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
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
  const { nombre, apellidos, email, password, rol } = req.body;

  // Validación
  if (!nombre || !apellidos || !email || !password || !rol) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos: nombre, apellidos, email, password, rol.',
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
    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, apellidos, email, rol`,
      [nombre.trim(), apellidos.trim(), email.toLowerCase().trim(), hash, rol]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente.',
      usuario: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese correo electrónico.',
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

  // Evita que el admin se desactive a sí mismo
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
