import { query } from '../config/db.js';

// Claves que nunca deben persistirse en texto plano en la auditoría
const CLAVES_SENSIBLES = /pass(word|wd)?|token|secret|hash|cookie|jwt|credential/i;
const MAX_JSON = 50 * 1024; // 50 KB por campo

// Sustituye valores sensibles (recursivo, acotado en profundidad)
function sanitizar(valor, profundidad = 0) {
  if (valor === null || valor === undefined) return valor;
  if (profundidad > 6) return '…';
  if (Array.isArray(valor)) {
    return valor.slice(0, 50).map((item) => sanitizar(item, profundidad + 1));
  }
  if (typeof valor === 'object') {
    const salida = {};
    for (const [clave, item] of Object.entries(valor)) {
      salida[clave] = CLAVES_SENSIBLES.test(clave) ? '••••••' : sanitizar(item, profundidad + 1);
    }
    return salida;
  }
  return valor;
}

// Convierte a JSON listo para la columna JSONB, con saneamiento y truncado
function serializar(datos) {
  if (datos === null || datos === undefined) return null;
  let origen = datos;
  if (typeof origen === 'string') {
    try {
      origen = JSON.parse(origen);
    } catch {
      return JSON.stringify({ _texto: origen.slice(0, 2000) });
    }
  }
  let json = JSON.stringify(sanitizar(origen));
  if (json && json.length > MAX_JSON) {
    const claves = origen && typeof origen === 'object' ? Object.keys(origen).slice(0, 40) : [];
    json = JSON.stringify({ _truncado: true, bytes: json.length, claves });
  }
  return json;
}

export async function registrarAuditoria({
  req,
  accion,
  tabla,
  registroId = null,
  datosAnteriores = null,
  datosNuevos = null,
  status = null,
}) {
  try {
    const usuarioId = req.user?.id || null;
    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;
    const metodo = req.method ? req.method.toUpperCase() : null;
    const ruta = (req.originalUrl || req.path || null)
      ? String(req.originalUrl || req.path).slice(0, 255)
      : null;

    await query(
      `INSERT INTO auditoria_logs 
       (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, ip, user_agent, metodo, ruta, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        usuarioId,
        accion,
        tabla,
        registroId,
        serializar(datosAnteriores),
        serializar(datosNuevos),
        ip,
        userAgent,
        metodo,
        ruta,
        status,
      ]
    );
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }
}