import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../config/db.js';
import { registrarAuditoria } from '../middlewares/auditoria.js';
import { listarPermisosDeRol, refrescar as refrescarCache, usandoBD } from '../services/permisos.service.js';
import { hashAspiranteInvitationToken } from '../services/aspirantes-invitations.service.js';


export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email y contraseña son requeridos.',
    });
  }

  try {
    const result = await query(
      'SELECT id, nombre, apellidos, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      await registrarAuditoria({
        req,
        accion: 'LOGIN_FALLIDO',
        tabla: 'usuarios',
        datosNuevos: { email, motivo: 'Usuario no encontrado' },
        status: 401,
      });
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (!usuario.activo) {
      await registrarAuditoria({
        req,
        accion: 'LOGIN_FALLIDO',
        tabla: 'usuarios',
        registroId: usuario.id,
        datosNuevos: { email, motivo: 'Cuenta desactivada' },
        status: 403,
      });
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido desactivada. Contacta al administrador.',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      await registrarAuditoria({
        req,
        accion: 'LOGIN_FALLIDO',
        tabla: 'usuarios',
        registroId: usuario.id,
        datosNuevos: { email, motivo: 'Contraseña incorrecta' },
        status: 401,
      });
      return res.status(401).json({
        success: false,
        message: 'Usuario o Correo Incorrecto.',
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await registrarAuditoria({
      req,
      accion: 'LOGIN',
      tabla: 'usuarios',
      registroId: usuario.id,
      datosNuevos: { email: usuario.email, rol: usuario.rol },
      status: 200,
    });

    return res.status(200).json({
      success: true,
      message: 'Sesión iniciada correctamente.',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rol: usuario.rol,
        permisos: listarPermisosDeRol(usuario.rol),
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  await registrarAuditoria({
    req,
    accion: 'LOGOUT',
    tabla: 'usuarios',
    registroId: req.user?.id || null,
    datosNuevos: { rol: req.user?.rol || null },
    status: 200,
  });

  return res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente.',
  });
};

export const me = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, apellidos, email, rol FROM usuarios WHERE id = $1 AND activo = TRUE',
      [req.user.id]
    );

    if (!result.rows[0]) {
      res.clearCookie('token');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const usuario = result.rows[0];
    if (req.user.rol !== usuario.rol || req.user.nombre !== usuario.nombre) {
      const token = jwt.sign(
        { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return res.status(200).json({
      success: true,
      usuario: { ...usuario, permisos: listarPermisosDeRol(usuario.rol) },
    });
  } catch (err) {
    console.error('Error en /me:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const activarCuentaAspirante = async (req, res) => {
  const { token, password } = req.body;

  try {
    const invitationHash = hashAspiranteInvitationToken(token);
    const activatedAccount = await withTransaction(async (client) => {
      const invitationResult = await client.query(
        `SELECT i.id, i.aspirante_id, a.usuario_id, u.id AS cuenta_id, u.rol, u.activo
         FROM aspirante_invitaciones i
         JOIN aspirantes a ON a.id = i.aspirante_id
         JOIN usuarios u ON u.id = a.usuario_id
         WHERE i.token_hash = $1 AND i.usado_en IS NULL AND i.vence_en > NOW()
         FOR UPDATE OF i, u`,
        [invitationHash]
      );
      const invitation = invitationResult.rows[0];
      if (!invitation || invitation.rol !== 'aspirante' || invitation.activo) {
        return null;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const accountResult = await client.query(
        `UPDATE usuarios
         SET password_hash = $1, activo = TRUE
         WHERE id = $2 AND rol = 'aspirante' AND activo = FALSE
         RETURNING id`,
        [passwordHash, invitation.cuenta_id]
      );
      if (!accountResult.rows[0]) {
        return null;
      }

      await client.query(
        'UPDATE aspirante_invitaciones SET usado_en = NOW() WHERE aspirante_id = $1 AND usado_en IS NULL',
        [invitation.aspirante_id]
      );
      return true;
    });

    if (!activatedAccount) {
      return res.status(400).json({
        success: false,
        message: 'El enlace no es válido, ya fue utilizado o expiró. Solicita uno nuevo a Control Escolar.'
      });
    }

    return res.json({
      success: true,
      message: 'Cuenta activada. Ya puedes iniciar sesión con tu correo y la contraseña que definiste.'
    });
  } catch (err) {
    console.error('Error activando cuenta de aspirante:', err);
    return res.status(500).json({ success: false, message: 'No fue posible activar la cuenta.' });
  }
};

// Refresca en caliente el cache de permisos desde la BD (solo admin).
export const refrescarPermisos = async (req, res) => {
  try {
    await refrescarCache();
    return res.status(200).json({
      success: true,
      message: 'Cache de permisos actualizado desde la base de datos.',
      usandoBD: usandoBD(),
    });
  } catch (err) {
    console.error('Error al refrescar permisos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
