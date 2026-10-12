// ============================================================
// CONFIGURACION LEGAL CENTRAL - PLANTILLA EDUCATIVA
// Fuente única de verdad para textos legales, contacto y datos institucionales.
//
// PLANTILLA EDUCATIVA. Requiere revision legal antes de uso real.
// 
// Objetivo de aprendizaje: Este archivo centraliza todos los datos legales
// para facilitar su reemplazo cuando el proyecto pase a producción.
// ============================================================

export const LEGAL_NOTES = {
  // Plantilla educativa. Requiere revision legal antes de uso real.
  DISCLAIMER: 'Plantilla educativa. Requiere revision legal antes de uso real.',
};

export const INSTITUCION_LEGAL = {
  // Nombres institucionales - Valores de DEMO únicamente
  // ¿Por qué? Centralizar identidad evita inconsistencias entre páginas
  nombre: 'Plataforma CECyTE (proyecto academico, demo)',
  nombreCompleto: 'Plataforma CECyTE - Proyecto Académico de Aprendizaje (Demo)',
  denominacionCorta: 'CECyTE (Demo)',
  estado: 'Tabasco',
  sede: 'Poblado Aquiles Serdán, Macuspana',
  ciudad: 'Macuspana',
  lema: 'Orgullo Lince',
  anioFundacion: 2026,
  
  // Datos de contacto - SOLO dominios example.* (nunca datos reales)
  // ¿Por qué? Cumple con "nunca usar datos reales" del alcance
  contactoEmail: 'contacto@example.com',
  soporteEmail: 'soporte@example.com',
  privacidadEmail: 'privacidad@example.com',
  
  // Dirección - Valor placeholder claramente marcado
  // ¿Por qué? Evita inventar direcciones reales
  direccion: '[PENDIENTE: dato real]',
  telefono: '[PENDIENTE: dato real]',
  rfc: '[PENDIENTE: dato real]',
  representanteLegal: '[PENDIENTE: dato real]',
  cargoRepresentante: '[PENDIENTE: dato real]',
};

// URLs oficiales - Solo placeholders para evitar requests externos innecesarios
// ¿Por qué? Prioridad: eliminar solicitudes externas innecesarias
export const URLS = {
  facebook: 'https://www.facebook.com/example',
  sitioWeb: 'https://example.org',
  mapa: 'https://maps.google.com/example',
};

// Texto para Aviso de Privacidad - Plantilla educativa estructurada
// ¿Por qué? Cada sección explica obligaciones de transparencia (Ley Federal
// de Protección de Datos Personales en Posesión de los Particulares - LFPDPPP)
// 
// FUENTE: Marco normativo mexicano sobre protección de datos personales (educativo)
export const AVISO_PRIVACIDAD = {
  titulo: 'Aviso de Privacidad',
  subtitulo: 'Plantilla educativa. Requiere revision legal antes de uso real.',
  
  secciones: [
    {
      titulo: 'I. Identidad y domicilio del responsable',
      explicacion: '¿Por qué existe? Identificar quién recopila datos (obligación de transparencia LFPDPPP).',
      contenido: `El responsable de la plataforma es ${INSTITUCION_LEGAL.nombreCompleto} (proyecto académico demostrativo), con domicilio en ${INSTITUCION_LEGAL.direccion}. Para dudas sobre este aviso, contactar a: ${INSTITUCION_LEGAL.privacidadEmail}.`
    },
    {
      titulo: 'II. Datos personales que se recaban',
      explicacion: '¿Por qué existe? Debe especificarse qué datos se recaban (principio de finalidad específica).',
      contenido: 'Para fines demostrativos y educativos, se recaban únicamente datos necesarios para funcionamiento: nombre, apellidos, correo electrónico (example.com), rol de usuario, datos académicos mínimos. No se recaban datos sensibles. Todos los datos son sintéticos de prueba.'
    },
    {
      titulo: 'III. Finalidades del tratamiento',
      explicacion: '¿Por qué existe? Principio de finalidad: solo usar datos para lo informado (LFPDPPP).',
      contenido: 'Los datos se utilizan exclusivamente para: (1) Autenticación y control de acceso, (2) Funcionalidades académicas demostrativas, (3) Auditoría interna educativa, (4) Mejoras del sistema en ambiente local. No se utilizan para publicidad ni se comparten con terceros.'
    },
    {
      titulo: 'IV. Transferencias de datos personales',
      explicacion: '¿Por qué existe? Debe informarse si hay transferencias; en demo no existen.',
      contenido: 'No se realizan transferencias de datos a terceros. La plataforma opera únicamente en entorno local/disponible para desarrollo. No existe procesamiento fuera del ambiente controlado.'
    },
    {
      titulo: 'V. Medios para ejercer derechos ARCO',
      explicacion: '¿Por qué existe? Garantiza derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO).',
      contenido: `El titular podrá ejercer sus derechos ARCO enviando solicitud a ${INSTITUCION_LEGAL.privacidadEmail}, con identificación válida. Tiempo de respuesta estimado: 20 días hábiles (marco referencial LFPDPPP).`
    },
    {
      titulo: 'VI. Cambios al aviso de privacidad',
      explicacion: '¿Por qué existe? Obliga a informar modificaciones al aviso.',
      contenido: 'Este aviso puede modificarse por necesidades educativas. Las modificaciones se documentarán en el repositorio del proyecto. Versión educativa - no aplicable a producción.'
    }
  ],
  
  fechaActualizacion: '2026-10-12',
  version: '1.0.0-educativa'
};

// Términos y Condiciones - Plantilla educativa
// ¿Por qué? Define reglas de uso, limitaciones de responsabilidad (marco contractual educativo)
export const TERMINOS_CONDICIONES = {
  titulo: 'Términos y Condiciones de Uso',
  subtitulo: 'Plantilla educativa. Requiere revision legal antes de uso real.',
  
  secciones: [
    {
      titulo: '1. Aceptación de términos',
      explicacion: '¿Por qué existe? Establece acuerdo entre usuario y plataforma.',
      contenido: 'Al acceder a esta plataforma (proyecto académico demo), el usuario acepta estos términos. Si no está de acuerdo, debe abstenerse de usarla.'
    },
    {
      titulo: '2. Propósito educativo',
      explicacion: '¿Por qué existe? Clarifica alcance: no es sistema productivo, es demostrativo.',
      contenido: 'Esta plataforma es exclusivamente para fines educativos y de aprendizaje. No está destinada a uso comercial o en producción con datos reales.'
    },
    {
      titulo: '3. Uso permitido',
      explicacion: '¿Por qué existe? Define límites de uso responsable.',
      contenido: 'Solo se permite uso para pruebas locales con datos sintéticos. Queda prohibido ingresar información personal real, sensible o confidencial.'
    },
    {
      titulo: '4. Propiedad intelectual',
      explicacion: '¿Por qué existe? Protege código y contenidos educativos.',
      contenido: 'El código y materiales son parte del proyecto educativo. Su uso debe respetar licenciamiento del repositorio.'
    },
    {
      titulo: '5. Limitación de responsabilidad',
      explicacion: '¿Por qué existe? Excluye responsabilidad por uso demostrativo (educativo).',
      contenido: 'Esta plataforma se proporciona "tal como está" con fines demostrativos. No se garantiza disponibilidad, exactitud o idoneidad para producción.'
    },
    {
      titulo: '6. Modificaciones',
      explicacion: '¿Por qué existe? Permite evolución del proyecto educativo.',
      contenido: 'Estos términos pueden modificarse sin previo aviso con fines educativos. Las versiones se registran en el repositorio.'
    }
  ],
  
  fechaActualizacion: '2026-10-12',
  version: '1.0.0-educativa'
};

// Política de Cookies - Plantilla educativa
// ¿Por qué? Cumplimiento de transparencia sobre cookies (considerando ePrivacy y buenas prácticas)
// Nota: Solo implementar banner si existen cookies no esenciales
export const POLITICA_COOKIES = {
  titulo: 'Política de Cookies',
  subtitulo: 'Plantilla educativa. Requiere revision legal antes de uso real.',
  
  tieneCookiesNoEsenciales: false, // Se evaluará en auditoría
  explicacionBanner: 'Solo se mostrará banner si existen cookies no esenciales.',
  
  secciones: [
    {
      titulo: '1. ¿Qué son las cookies?',
      explicacion: '¿Por qué existe? Explica técnicamente para transparencia.',
      contenido: 'Las cookies son pequeños archivos que se almacenan en el navegador para mejorar la experiencia de usuario.'
    },
    {
      titulo: '2. Cookies utilizadas',
      explicacion: '¿Por qué existe? Debe detallarse cada tipo (esenciales vs no esenciales).',
      contenido: 'En la configuración actual del proyecto demo: solo se utilizan cookies técnicas/esenciales para autenticación (token de sesión). No se utilizan cookies de análisis, publicidad o seguimiento de terceros.'
    },
    {
      titulo: '3. Consentimiento',
      explicacion: '¿Por qué existe? Requiere consentimiento explícito para cookies no esenciales.',
      contenido: 'Al no existir cookies no esenciales, no se requiere consentimiento adicional para cookies de seguimiento. Si se agregaran cookies no esenciales, se solicitaría consentimiento explícito.'
    },
    {
      titulo: '4. Gestión de cookies',
      explicacion: '¿Por qué existe? Permite al usuario controlar cookies.',
      contenido: 'El usuario puede gestionar o eliminar cookies desde la configuración de su navegador.'
    }
  ],
  
  fechaActualizacion: '2026-10-12',
  version: '1.0.0-educativa'
};

// Política de Retención y Eliminación de Datos
// ¿Por qué? Cumplimiento con principio de minimización y plazo de retención (LFPDPPP)
// Implementación requerida por alcance: tabla de retención explícita
export const POLITICA_RETENCION = {
  titulo: 'Política de Retención y Eliminación de Datos',
  subtitulo: 'Plantilla educativa. Requiere revision legal antes de uso real.',
  
  explicacionGeneral: 'Principio de minimización: conservar datos solo el tiempo necesario. Datos de demo = sintéticos.',
  
  categorias: [
    {
      categoria: 'Datos de autenticación',
      datos: 'Tokens de sesión, logs de login/logout',
      tiempoRetencion: 'Sesión activa + 30 días (logs auditoría)',
      accionRetencion: 'eliminado',
      justificacion: 'Seguridad y trazabilidad mínima para fines educativos'
    },
    {
      categoria: 'Datos de usuario (sintéticos)',
      datos: 'Nombre, email demo, rol',
      tiempoRetencion: 'Mientras persista BD local o hasta solicitud de eliminación',
      accionRetencion: 'anonymizado_o_eliminado',
      justificacion: 'Proyecto educativo - datos solo para demostración'
    },
    {
      categoria: 'Logs de auditoría',
      datos: 'auditoria_logs (JSONB before/after)',
      tiempoRetencion: '90 días (referencial educativo)',
      accionRetencion: 'retenido_minimo',
      justificacion: 'Trazabilidad para aprendizaje; no contiene datos sensibles reales'
    },
    {
      categoria: 'Datos académicos (demo)',
      datos: 'Calificaciones, asistencia, inscripciones (sintéticos)',
      tiempoRetencion: 'Hasta solicitud de eliminación o reset BD',
      accionRetencion: 'eliminado_bajo_solicitud',
      justificacion: 'Datos ficticios para demostración'
    }
  ],
  
  flujoEliminacion: {
    descripcion: 'Solicitud de eliminación (data deletion request) vía endpoint dedicado',
    pasos: [
      '1. Usuario solicita eliminación (soporteEmail)',
      '2. Verificar identidad',
      '3. Determinar qué datos eliminar/anonymizar/retener',
      '4. Ejecutar eliminación transaccional con registro en auditoría',
      '5. Confirmar al solicitante'
    ]
  },
  
  fechaActualizacion: '2026-10-12',
  version: '1.0.0-educativa'
};

// Consentimiento - Flujos requeridos
export const CONSENTIMIENTO = {
  cookieConsent: {
    habilitado: false, // Se activa solo si hay cookies no esenciales
    texto: 'Usamos cookies técnicas esenciales. No utilizamos cookies de seguimiento en este entorno demo.'
  },
  consentimientoMinors: {
    habilitado: true, // Relevante por dominio (alumnos/aspirantes)
    explicacion: 'Entorno educativo con alumnos - requiere considerar consentimiento de tutor/legal',
    nota: 'Plantilla educativa: en producción requiere marco normativo aplicable (menores). Para demo se documenta como requerimiento.'
  },
  verificacionEmail: {
    habilitado: false, // Pendiente (Fase 3 según plan)
    texto: 'Verificación de correo electrónico (flujo a implementar)'
  }
};

// Footer legal
export const FOOTER_LEGAL = {
  textoCopyright: `© ${new Date().getFullYear()} ${INSTITUCION_LEGAL.nombre} — Plantilla educativa (demo). Todos los derechos reservados.`,
  enlaces: [
    { texto: 'Aviso de Privacidad', ruta: '/legal/privacidad' },
    { texto: 'Términos y Condiciones', ruta: '/legal/terminos' },
    { texto: 'Política de Cookies', ruta: '/legal/cookies' },
  ]
};
