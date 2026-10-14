import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { withTransaction } from '../config/db.js';
import { sendEmail } from './mailer.service.js';

const INVITATION_LIFETIME_HOURS = 48;

export const hashAspiranteInvitationToken = (token) =>
  createHash('sha256').update(token).digest('hex');

const createInvitationError = (code, message) => Object.assign(new Error(message), { code });

export const prepararInvitacionAspirante = async (client, aspiranteId, createdBy) => {
  const aspiranteResult = await client.query(
    `SELECT id, nombre, apellidos, email, telefono, usuario_id
     FROM aspirantes
     WHERE id = $1
     FOR UPDATE`,
    [aspiranteId]
  );
  const aspirante = aspiranteResult.rows[0];
  if (!aspirante) {
    throw createInvitationError('ASPIRANTE_NO_ENCONTRADO', 'Aspirante no encontrado.');
  }

  let usuarioId = aspirante.usuario_id;
  if (usuarioId) {
    const usuarioResult = await client.query(
      'SELECT id, rol, activo FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    const usuario = usuarioResult.rows[0];
    if (!usuario || usuario.rol !== 'aspirante') {
      throw createInvitationError('CUENTA_NO_DISPONIBLE', 'La cuenta vinculada no está disponible para invitación.');
    }
    if (usuario.activo) {
      throw createInvitationError('CUENTA_YA_ACTIVA', 'La cuenta del aspirante ya está activa.');
    }
  } else {
    const cuentaExistente = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [aspirante.email]
    );
    if (cuentaExistente.rows[0]) {
      throw createInvitationError(
        'CORREO_ASOCIADO',
        'El correo ya pertenece a otra cuenta. Verifica la identidad con Control Escolar.'
      );
    }

    const passwordAleatoria = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(passwordAleatoria, 12);
    const usuarioNuevo = await client.query(
      `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo, telefono)
       VALUES ($1, $2, LOWER($3), $4, 'aspirante', FALSE, $5)
       RETURNING id`,
      [aspirante.nombre, aspirante.apellidos, aspirante.email, passwordHash, aspirante.telefono]
    );
    usuarioId = usuarioNuevo.rows[0].id;
    await client.query(
      'UPDATE aspirantes SET usuario_id = $1 WHERE id = $2',
      [usuarioId, aspirante.id]
    );
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashAspiranteInvitationToken(token);
  const venceEn = new Date(Date.now() + INVITATION_LIFETIME_HOURS * 60 * 60 * 1000);

  await client.query(
    `UPDATE aspirante_invitaciones
     SET usado_en = NOW()
     WHERE aspirante_id = $1 AND usado_en IS NULL`,
    [aspirante.id]
  );
  await client.query(
    `INSERT INTO aspirante_invitaciones (aspirante_id, token_hash, vence_en, creado_por)
     VALUES ($1, $2, $3, $4)`,
    [aspirante.id, tokenHash, venceEn, createdBy]
  );

  return {
    token,
    email: aspirante.email,
    nombre: aspirante.nombre,
    aspiranteId: aspirante.id,
    usuarioId,
  };
};

export const prepararNuevaInvitacionAspirante = (aspiranteId, createdBy) =>
  withTransaction((client) => prepararInvitacionAspirante(client, aspiranteId, createdBy));

export const enviarInvitacionAspirante = async ({ token, email, nombre, aspiranteId }) => {
  const configuredUrl = process.env.FRONTEND_URL
    || process.env.CORS_ORIGIN?.split(',')[0]?.trim()
    || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
  let frontendOrigin;
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('URL de frontend inválida.');
    }
    frontendOrigin = url.origin;
  } catch {
    throw createInvitationError(
      'FRONTEND_URL_NO_CONFIGURADA',
      'Configura FRONTEND_URL con el origen público de la plataforma para enviar invitaciones.'
    );
  }

  const enlace = new URL('/activar-cuenta', frontendOrigin);
  enlace.searchParams.set('token', token);
  const resultado = await sendEmail({
    to: email,
    subject: 'Activa tu acceso de aspirante',
    text: [
      `Hola ${nombre},`,
      '',
      'Control Escolar creó tu acceso a la plataforma académica.',
      `Activa tu cuenta y define una contraseña en este enlace (válido por ${INVITATION_LIFETIME_HOURS} horas):`,
      enlace.toString(),
      '',
      'Si no esperabas este mensaje, contacta a Control Escolar.',
      `Referencia de solicitud: ${aspiranteId}.`,
    ].join('\n'),
  });

  if (!resultado.accepted?.includes(email) || resultado.rejected?.includes(email)) {
    throw createInvitationError(
      'INVITACION_NO_ENTREGADA',
      'El servidor de correo no confirmó la entrega de la invitación.'
    );
  }

  return { email };
};
