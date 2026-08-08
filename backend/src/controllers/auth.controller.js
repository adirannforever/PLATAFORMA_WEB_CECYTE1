import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';


export const login = async (req, res) => {
  console.log('Body recibido:', req.body);
  console.log('Email:', req.body.email);
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
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido desactivada. Contacta al administrador.',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
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
    console.log('Token generado:', token);
    console.log('Cookie establecida');

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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

    return res.status(200).json({
      success: true,
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error('Error en /me:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
