import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Inicia sesión para continuar.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    // El token expiró o fue manipulado
    res.clearCookie('token');
    return res.status(401).json({
      success: false,
      message: 'Sesión inválida o expirada. Por favor inicia sesión de nuevo.',
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso restringido. Se requiere rol: ${roles.join(' o ')}.`,
      });
    }

    next();
  };
};

export const requireTutor = async (req, res, next) => {
  try {
    const { query } = await import('../config/db.js');
    const result = await query(
      'SELECT id FROM grupos WHERE tutor_id = $1 AND activo = TRUE LIMIT 1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(403).json({
        success: false,
        message: 'Esta acción requiere ser tutor de un grupo activo.',
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
