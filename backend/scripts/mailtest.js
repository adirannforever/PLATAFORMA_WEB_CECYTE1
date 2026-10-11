// Prueba del env\u00edo de correo v\u00eda SMTP (Mailpit en desarrollo).
// Ejecutar: node scripts/mailtest.js

import { testConnection, sendEmail } from '../src/services/mailer.service.js';

const test = async () => {
  console.log('Verificando conexi\u00f3n SMTP...');

  const conn = await testConnection();
  if (!conn.ok) {
    console.error('ERROR de conexi\u00f3n SMTP:', conn.error);
    process.exit(1);
  }
  console.log('OK \u2713 Conexi\u00f3n SMTP establecida.');

  const testEmail =
    process.env.TEST_EMAIL ||
    process.env.MAILPIT_BOX_DEFAULT_NAME ||
    'test@cecyte.edu.mx';

  console.log(`Enviando correo de prueba a: ${testEmail}...`);

  const email = await sendEmail({
    to: testEmail,
    subject: 'Prueba de correo - CECyTE Platform',
    text: 'Este es un correo de prueba para verificar el env\u00edo v\u00eda Mailpit/SMTP.',
    html: '<p>Este es un correo de <b>prueba</b> para verificar el env\u00edo v\u00eda Mailpit/SMTP.</p>',
  });

  console.log('OK \u2713 Correo enviado.');
  console.log('  - messageId:', email.messageId);
  console.log('  - aceptados:', email.accepted.join(', '));
  console.log('  - rechazados:', email.rejected.join(',') || 'ninguno');

  console.log('\nURL de inspecci\u00f3n en el panel de Mailpit:');
  console.log('  ' + (process.env.MAILPIT_API_URL || 'http://localhost:8025'));
};

test().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
