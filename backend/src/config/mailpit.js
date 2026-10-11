// Configuración del cliente SMTP (envío de correo).
// Modo producción: variables SMTP_* (SendGrid / Resend / Mailgun / etc.)
// Modo desarrollo: Mailpit (SMTP en localhost:1025).
export const mailConfig = {
  get smtp() {
    if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE),
        auth: process.env.SMTP_AUTH_USER && process.env.SMTP_AUTH_PASS
          ? { user: process.env.SMTP_AUTH_USER, pass: process.env.SMTP_AUTH_PASS }
          : undefined,
      };
    }

    return {
      host: process.env.MAILHOG_SMTP_HOST || 'localhost',
      port: Number(process.env.MAILHOG_SMTP_PORT || 1025),
      secure: false,
      auth: process.env.MAILHOG_SMTP_USER
        ? { user: process.env.MAILHOG_SMTP_USER, pass: process.env.MAILHOG_SMTP_PASS }
        : undefined,
    };
  },

  get from() {
    return process.env.SMTP_FROM || process.env.MAILHOG_BOX_DEFAULT_NAME || 'no-reply@cecyte.edu.mx';
  },

  get mailHogApiUrl() {
    return process.env.MAILHOG_API_URL || 'http://localhost:8025';
  },
};
