import nodemailer from 'nodemailer';
import { mailConfig } from '../config/mailpit.js';

let transporter;

export const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: mailConfig.smtp.host,
    port: mailConfig.smtp.port,
    secure: mailConfig.smtp.secure,
    auth: mailConfig.smtp.auth,
  });

  return transporter;
};

/**
   * Envía un correo de forma segura.
   * @param {object} options - Opciones del correo
   * @param {string} options.to - Destinatario(es) (email o array)
   * @param {string} options.subject - Asunto
   * @param {string} [options.text] - Texto plano
   * @param {string} [options.html] - HTML
   * @param {string} [options.from] - Remitente (por defecto mailConfig.from)
   * @param {string|string[]} [options.cc]
   * @param {string|string[]} [options.bcc]
   */
export const sendEmail = async (options) => {
  const { to, subject, text, html, from, cc, bcc } = options;

  const info = await getTransporter().sendMail({
    from: from || mailConfig.from,
    to,
    subject,
    text,
    html,
    cc,
    bcc,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    envelope: info.envelope,
  };
};

export const testConnection = async () => {
  try {
    const result = await getTransporter().verify();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
