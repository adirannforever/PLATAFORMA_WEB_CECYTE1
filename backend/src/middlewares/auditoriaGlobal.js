import { registrarAuditoria } from './auditoria.js';
const EXCLUIDAS = ['/auth/me', '/auth/login', '/auth/logout', '/health'];

export function auditoriaGlobal(req, res, next) {
  
  if (EXCLUIDAS.some(r => req.path.includes(r))) {
    return next();
  }

  const originalJson = res.json;

  res.json = function (data) {
    if (data && data.success !== false) {
      let accion = '';
      const metodo = req.method.toUpperCase();
      const path = req.route?.path || req.path;

      switch (metodo) {
        case 'POST':
          accion = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          accion = 'UPDATE';
          break;
        case 'DELETE':
          accion = 'DELETE';
          break;
        default:
          accion = 'VIEW';
      }

      const tabla = path.split('/')[2] || 'desconocida';
      const registroId = req.params.id || req.body?.id || null;

      registrarAuditoria({
        req,
        accion,
        tabla,
        registroId: registroId ? parseInt(registroId) : null,
        datosNuevos: ['POST', 'PUT', 'PATCH'].includes(metodo) ? req.body : null,
      }).catch(console.error);
    }

    return originalJson.call(this, data);
  };

  next();
}