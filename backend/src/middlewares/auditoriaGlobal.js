import { registrarAuditoria } from './auditoria.js';

const EXCLUIDAS = ['/auth/me', '/auth/login', '/auth/logout', '/health'];

export function auditoriaGlobal(req, res, next) {
  // Ignorar rutas excluidas
  if (EXCLUIDAS.some((r) => req.originalUrl?.includes(r) || req.path?.includes(r))) {
    return next();
  }

  const metodo = req.method.toUpperCase();

  // Solo auditar mutaciones exitosas (POST, PUT, PATCH, DELETE)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) {
    return next();
  }

  // Escuchar el evento 'finish' de forma asíncrona y no bloqueante
  res.on('finish', () => {
    // Solo auditar si la respuesta fue exitosa (2xx o 3xx)
    if (res.statusCode >= 200 && res.statusCode < 400) {
      setImmediate(async () => {
        try {
          let accion = 'UPDATE';
          if (metodo === 'POST') accion = 'CREATE';
          else if (metodo === 'DELETE') accion = 'DELETE';

          // Extraer nombre del recurso de la URL
          const segments = (req.originalUrl || req.path).split('?')[0].split('/').filter(Boolean);
          // Generalmente '/api/<recurso>/...' -> segments[1] es el recurso
          const tabla = segments[1] || segments[0] || 'general';

          const registroId = req.params?.id || req.body?.id || null;

          await registrarAuditoria({
            req,
            accion,
            tabla,
            registroId: registroId && !isNaN(registroId) ? parseInt(registroId, 10) : null,
            datosNuevos: metodo !== 'DELETE' ? req.body : null,
          });
        } catch (err) {
          // No romper nunca la ejecución por fallo en auditoría
          console.error('[Auditoría Global] Error registrando log:', err.message);
        }
      });
    }
  });

  next();
}