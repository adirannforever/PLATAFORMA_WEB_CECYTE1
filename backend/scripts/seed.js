import dotenv from 'dotenv';
dotenv.config();

import { query } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

const CONFIG = {
  CICLO_ACTUAL: '2025-2026',
  CICLO_INICIO: '2025-09-01',
  CICLO_FIN: '2026-07-31',
  SEMESTRES: [1, 2, 3, 4, 5, 6],
  TURNOS: [
    { id: 1, nombre: 'Matutino', hora_inicio: '07:00', hora_fin: '14:10' },
    { id: 2, nombre: 'Vespertino', hora_inicio: '12:00', hora_fin: '19:10' }
  ],
  ESPECIALIDADES: [
    { clave: 'DGD', nombre: 'Tecnico en Diseno Grafico Digital', descripcion: 'Diseno grafico digital, comunicacion visual, multimedia' },
    { clave: 'ELEC', nombre: 'Tecnico en Electronica', descripcion: 'Electronica analogica y digital, circuitos, microcontroladores' },
    { clave: 'PIA', nombre: 'Tecnico en Produccion Industrial de Alimentos', descripcion: 'Procesos industriales, control de calidad, produccion alimentaria' }
  ],
  // Mapeo de tutores por especialidad (usando emails de docentes)
  TUTORES_POR_ESPECIALIDAD: {
    'DGD': ['mario.garcia@cecyte.edu.mx', 'maria.lopez@cecyte.edu.mx'],
    'ELEC': ['juan.martinez@cecyte.edu.mx', 'ana.rodriguez@cecyte.edu.mx'],
    'PIA': ['luis.gonzalez@cecyte.edu.mx', 'carmen.reyes@cecyte.edu.mx']
  },
  EDIFICIOS: [
    { clave: 'A', nombre: 'Edificio A', tipo: 'aulas' },
    { clave: 'B', nombre: 'Edificio B', tipo: 'aulas' },
    { clave: 'C', nombre: 'Edificio C', tipo: 'aulas' },
    { clave: 'INGLES', nombre: 'Salon de Ingles', tipo: 'especial' },
    { clave: 'LABS', nombre: 'Edificio de Laboratorios', tipo: 'laboratorios' }
  ],
  AULAS: [
    { edificio: 'A', nombre: 'Aula 101', tipo: 'salon', capacidad: 30 },
    { edificio: 'A', nombre: 'Aula 102', tipo: 'salon', capacidad: 30 },
    { edificio: 'A', nombre: 'Aula 103', tipo: 'salon', capacidad: 30 },
    { edificio: 'A', nombre: 'Aula 104', tipo: 'salon', capacidad: 30 },
    { edificio: 'B', nombre: 'Aula 201', tipo: 'salon', capacidad: 35 },
    { edificio: 'B', nombre: 'Aula 202', tipo: 'salon', capacidad: 35 },
    { edificio: 'B', nombre: 'Aula 203', tipo: 'salon', capacidad: 35 },
    { edificio: 'C', nombre: 'Aula 301', tipo: 'salon', capacidad: 30 },
    { edificio: 'C', nombre: 'Aula 302', tipo: 'salon', capacidad: 30 },
    { edificio: 'LABS', nombre: 'Laboratorio de Electronica', tipo: 'laboratorio', capacidad: 20 },
    { edificio: 'LABS', nombre: 'Laboratorio de Alimentos', tipo: 'laboratorio', capacidad: 20 },
    { edificio: 'LABS', nombre: 'Laboratorio de Computo', tipo: 'laboratorio', capacidad: 30 },
    { edificio: 'INGLES', nombre: 'Salon de Ingles', tipo: 'especial', capacidad: 25 }
  ],
  PERIODOS_DIA: [
    { turno: 'Matutino', numero: 1, hora_inicio: '07:00', hora_fin: '07:50' },
    { turno: 'Matutino', numero: 2, hora_inicio: '07:50', hora_fin: '08:40' },
    { turno: 'Matutino', numero: 3, hora_inicio: '08:40', hora_fin: '09:30' },
    { turno: 'Matutino', numero: 4, hora_inicio: '09:30', hora_fin: '10:20' },
    { turno: 'Matutino', numero: 5, hora_inicio: '10:20', hora_fin: '11:10' },
    { turno: 'Matutino', numero: 6, hora_inicio: '11:10', hora_fin: '12:00' },
    { turno: 'Matutino', numero: 7, hora_inicio: '12:00', hora_fin: '12:50' },
    { turno: 'Vespertino', numero: 1, hora_inicio: '12:00', hora_fin: '12:50' },
    { turno: 'Vespertino', numero: 2, hora_inicio: '12:50', hora_fin: '13:40' },
    { turno: 'Vespertino', numero: 3, hora_inicio: '13:40', hora_fin: '14:30' },
    { turno: 'Vespertino', numero: 4, hora_inicio: '14:30', hora_fin: '15:20' },
    { turno: 'Vespertino', numero: 5, hora_inicio: '15:20', hora_fin: '16:10' },
    { turno: 'Vespertino', numero: 6, hora_inicio: '16:10', hora_fin: '17:00' },
    { turno: 'Vespertino', numero: 7, hora_inicio: '17:00', hora_fin: '17:50' }
  ],
  CONCEPTOS_PAGO: [
    { nombre: 'Derecho a examen de admision', precio: 150.00 },
    { nombre: 'Aportacion institucional semestral', precio: 200.00 },
    { nombre: 'Historial academico', precio: 50.00 },
    { nombre: 'Constancia de estudios', precio: 40.00 },
    { nombre: 'Certificado de terminacion', precio: 300.00 },
    { nombre: 'Credencial escolar', precio: 30.00 },
    { nombre: 'Seguro facultativo estudiantil', precio: 60.00 }
  ],
  DOCUMENTOS: [
    { clave: 'ACTA_NACI_COPIA', nombre: 'Copia del acta de nacimiento', etapa: 'preinscripcion', obligatorio: true, precio: 0 },
    { clave: 'CURP_ASPIRANTE', nombre: 'CURP actualizada del aspirante', etapa: 'preinscripcion', obligatorio: true, precio: 0 },
    { clave: 'BOLETAS_SEC', nombre: 'Constancia de estudios / boletas de secundaria 1°-3°', etapa: 'preinscripcion', obligatorio: true, precio: 0 },
    { clave: 'FOTOS_INF_PRE', nombre: 'Fotografias tamano infantil (2)', etapa: 'preinscripcion', obligatorio: true, precio: 0 },
    { clave: 'COMPROBANTE_PAGO_FICHA', nombre: 'Comprobante de pago derecho a examen', etapa: 'preinscripcion', obligatorio: true, precio: 0 },
    { clave: 'CERT_SEC_ORIG', nombre: 'Certificado de secundaria original', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'ACTA_NACI_ORIG', nombre: 'Acta de nacimiento original y copia', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'CURP_IMPRESA', nombre: 'CURP impresa reciente', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'CARTA_BUENA_COND', nombre: 'Carta de buena conducta (secundaria)', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'FOTOS_INF_INS', nombre: 'Fotografias tamano infantil fondo blanco', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'CERT_MEDICO', nombre: 'Certificado medico reciente', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'FORMATO_INSCRIPCION', nombre: 'Formato de inscripcion firmado', etapa: 'inscripcion', obligatorio: true, precio: 0 },
    { clave: 'FICHA_REINS', nombre: 'Ficha de reinscripcion firmada por alumno y tutor', etapa: 'reinscripcion', obligatorio: true, precio: 0 },
    { clave: 'COMPROBANTE_APORTACION', nombre: 'Comprobante de aportacion institucional (banco)', etapa: 'reinscripcion', obligatorio: true, precio: 0 },
    { clave: 'BOLETA_SEMESTRE_ANT', nombre: 'Copia de boleta del semestre anterior', etapa: 'reinscripcion', obligatorio: true, precio: 0 },
    { clave: 'CARNET_IMSS', nombre: 'Carnet del IMSS / vigencia de derechos', etapa: 'reinscripcion', obligatorio: true, precio: 0 },
    { clave: 'CURP_TUTOR_REINS', nombre: 'CURP del alumno y tutor (actualizacion)', etapa: 'reinscripcion', obligatorio: false, precio: 0 }
  ],
  MATERIAS_TRONCALES_GENERALES: {
    1: [
      { nombre: 'Matematicas I', clave: 'MAT-I', horas: 4 },
      { nombre: 'Espanol I', clave: 'ESP-I', horas: 3 },
      { nombre: 'Ingles I', clave: 'ING-I', horas: 3 },
      { nombre: 'Quimica I', clave: 'QUI-I', horas: 3 },
      { nombre: 'Historia de Mexico', clave: 'HIS-MEX', horas: 3 },
      { nombre: 'Formacion Civica y Etica', clave: 'FCYE', horas: 2 },
      { nombre: 'Educacion Fisica I', clave: 'EDF-I', horas: 2 },
      { nombre: 'Tecnologias de la Informacion', clave: 'TIC', horas: 2 },
      { nombre: 'Orientacion Educativa', clave: 'ORI-EDU', horas: 2 }
    ],
    2: [
      { nombre: 'Matematicas II', clave: 'MAT-II', horas: 4 },
      { nombre: 'Espanol II', clave: 'ESP-II', horas: 3 },
      { nombre: 'Ingles II', clave: 'ING-II', horas: 3 },
      { nombre: 'Quimica II', clave: 'QUI-II', horas: 3 },
      { nombre: 'Historia de Mexico II', clave: 'HIS-MEX-II', horas: 3 },
      { nombre: 'Formacion Civica y Etica II', clave: 'FCYE-II', horas: 2 },
      { nombre: 'Educacion Fisica II', clave: 'EDF-II', horas: 2 },
      { nombre: 'Tecnologias de la Informacion II', clave: 'TIC-II', horas: 2 }
    ],
    3: [
      { nombre: 'Matematicas III', clave: 'MAT-III', horas: 4 },
      { nombre: 'Espanol III', clave: 'ESP-III', horas: 3 },
      { nombre: 'Ingles III', clave: 'ING-III', horas: 3 },
      { nombre: 'Fisica I', clave: 'FIS-I', horas: 3 },
      { nombre: 'Quimica III', clave: 'QUI-III', horas: 3 },
      { nombre: 'Historia Universal', clave: 'HIS-UNI', horas: 3 }
    ],
    4: [
      { nombre: 'Matematicas IV', clave: 'MAT-IV', horas: 4 },
      { nombre: 'Espanol IV', clave: 'ESP-IV', horas: 3 },
      { nombre: 'Ingles IV', clave: 'ING-IV', horas: 3 },
      { nombre: 'Fisica II', clave: 'FIS-II', horas: 3 },
      { nombre: 'Biologia I', clave: 'BIO-I', horas: 3 }
    ],
    5: [
      { nombre: 'Matematicas V', clave: 'MAT-V', horas: 4 },
      { nombre: 'Espanol V', clave: 'ESP-V', horas: 3 },
      { nombre: 'Ingles V', clave: 'ING-V', horas: 3 },
      { nombre: 'Fisica III', clave: 'FIS-III', horas: 3 },
      { nombre: 'Biologia II', clave: 'BIO-II', horas: 3 },
      { nombre: 'Metodologia de la Investigacion', clave: 'MET-INV', horas: 2 }
    ],
    6: [
      { nombre: 'Matematicas VI', clave: 'MAT-VI', horas: 4 },
      { nombre: 'Espanol VI', clave: 'ESP-VI', horas: 3 },
      { nombre: 'Ingles VI', clave: 'ING-VI', horas: 3 },
      { nombre: 'Proyecto de Investigacion', clave: 'PRO-INV', horas: 2 },
      { nombre: 'Orientacion Educativa II', clave: 'ORI-EDU-II', horas: 2 }
    ]
  },
  MATERIAS_ESPECIALIDAD: {
    'DGD': {
      1: [{ nombre: 'Introduccion al Diseno Grafico Digital', clave: 'DGD-INTRO', horas: 4 }],
      2: [{ nombre: 'Modulo I: Fundamentos del Diseno - Submodulo 1', clave: 'DGD-M1-S1', horas: 3 },
          { nombre: 'Modulo I: Fundamentos del Diseno - Submodulo 2', clave: 'DGD-M1-S2', horas: 3 }],
      3: [{ nombre: 'Modulo II: Diseno Grafico Publicitario - Submodulo 1', clave: 'DGD-M2-S1', horas: 3 },
          { nombre: 'Modulo II: Diseno Grafico Publicitario - Submodulo 2', clave: 'DGD-M2-S2', horas: 3 }],
      4: [{ nombre: 'Modulo III: Diseno Multimedia - Submodulo 1', clave: 'DGD-M3-S1', horas: 3 },
          { nombre: 'Modulo III: Diseno Multimedia - Submodulo 2', clave: 'DGD-M3-S2', horas: 3 }],
      5: [{ nombre: 'Modulo IV: Diseno de Proyectos Graficos - Submodulo 1', clave: 'DGD-M4-S1', horas: 3 },
          { nombre: 'Modulo IV: Diseno de Proyectos Graficos - Submodulo 2', clave: 'DGD-M4-S2', horas: 3 }],
      6: [{ nombre: 'Modulo V: Gestion del Diseno - Submodulo 1', clave: 'DGD-M5-S1', horas: 3 },
          { nombre: 'Modulo V: Gestion del Diseno - Submodulo 2', clave: 'DGD-M5-S2', horas: 3 }]
    },
    'ELEC': {
      1: [{ nombre: 'Introduccion a la Electronica', clave: 'ELEC-INTRO', horas: 4 }],
      2: [{ nombre: 'Modulo I: Instalaciones Electricas - Submodulo 1', clave: 'ELEC-M1-S1', horas: 3 },
          { nombre: 'Modulo I: Instalaciones Electricas - Submodulo 2', clave: 'ELEC-M1-S2', horas: 3 }],
      3: [{ nombre: 'Modulo II: Electronica de Potencia - Submodulo 1', clave: 'ELEC-M2-S1', horas: 3 },
          { nombre: 'Modulo II: Electronica de Potencia - Submodulo 2', clave: 'ELEC-M2-S2', horas: 3 }],
      4: [{ nombre: 'Modulo III: Sistemas Digitales - Submodulo 1', clave: 'ELEC-M3-S1', horas: 3 },
          { nombre: 'Modulo III: Sistemas Digitales - Submodulo 2', clave: 'ELEC-M3-S2', horas: 3 }],
      5: [{ nombre: 'Modulo IV: Automatizacion Industrial - Submodulo 1', clave: 'ELEC-M4-S1', horas: 3 },
          { nombre: 'Modulo IV: Automatizacion Industrial - Submodulo 2', clave: 'ELEC-M4-S2', horas: 3 }],
      6: [{ nombre: 'Modulo V: Mantenimiento Electronico - Submodulo 1', clave: 'ELEC-M5-S1', horas: 3 },
          { nombre: 'Modulo V: Mantenimiento Electronico - Submodulo 2', clave: 'ELEC-M5-S2', horas: 3 }]
    },
    'PIA': {
      1: [{ nombre: 'Introduccion a la Industria Alimentaria', clave: 'PIA-INTRO', horas: 4 }],
      2: [{ nombre: 'Modulo I: Fundamentos de la Industria Alimentaria - Submodulo 1', clave: 'PIA-M1-S1', horas: 3 },
          { nombre: 'Modulo I: Fundamentos de la Industria Alimentaria - Submodulo 2', clave: 'PIA-M1-S2', horas: 3 }],
      3: [{ nombre: 'Modulo II: Procesos de Elaboracion - Submodulo 1', clave: 'PIA-M2-S1', horas: 3 },
          { nombre: 'Modulo II: Procesos de Elaboracion - Submodulo 2', clave: 'PIA-M2-S2', horas: 3 }],
      4: [{ nombre: 'Modulo III: Control de Calidad Alimentario - Submodulo 1', clave: 'PIA-M3-S1', horas: 3 },
          { nombre: 'Modulo III: Control de Calidad Alimentario - Submodulo 2', clave: 'PIA-M3-S2', horas: 3 }],
      5: [{ nombre: 'Modulo IV: Seguridad Alimentaria - Submodulo 1', clave: 'PIA-M4-S1', horas: 3 },
          { nombre: 'Modulo IV: Seguridad Alimentaria - Submodulo 2', clave: 'PIA-M4-S2', horas: 3 }],
      6: [{ nombre: 'Modulo V: Gestion de la Produccion - Submodulo 1', clave: 'PIA-M5-S1', horas: 3 },
          { nombre: 'Modulo V: Gestion de la Produccion - Submodulo 2', clave: 'PIA-M5-S2', horas: 3 }]
    }
  }
};

async function runSeed() {
  console.log('Iniciando seeding...');

  try {
    // ===== 1. TURNOS =====
    console.log('Insertando turnos...');
    for (const turno of CONFIG.TURNOS) {
      await query(
        `INSERT INTO turnos (id, nombre, hora_inicio, hora_fin)
         VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [turno.id, turno.nombre, turno.hora_inicio, turno.hora_fin]
      );
    }

    // ===== 2. ESPECIALIDADES =====
    console.log('Insertando especialidades...');
    for (const esp of CONFIG.ESPECIALIDADES) {
      await query(
        `INSERT INTO especialidades (clave, nombre, descripcion)
         VALUES ($1, $2, $3) ON CONFLICT (clave) DO NOTHING`,
        [esp.clave, esp.nombre, esp.descripcion]
      );
    }
    const espRes = await query('SELECT id, clave FROM especialidades');
    const especialidadMap = {};
    espRes.rows.forEach(e => { especialidadMap[e.clave] = e.id; });

    // ===== 3. CICLO ESCOLAR =====
    console.log('Insertando ciclo escolar...');
    const cicloRes = await query(
      `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, TRUE) ON CONFLICT (nombre) DO NOTHING
       RETURNING id`,
      [CONFIG.CICLO_ACTUAL, CONFIG.CICLO_INICIO, CONFIG.CICLO_FIN]
    );
    let cicloId;
    if (cicloRes.rows.length > 0) {
      cicloId = cicloRes.rows[0].id;
    } else {
      const existing = await query('SELECT id FROM ciclos_escolares WHERE nombre = $1', [CONFIG.CICLO_ACTUAL]);
      cicloId = existing.rows[0].id;
    }
    console.log('   Ciclo ID: ' + cicloId);

    // ===== 4. EDIFICIOS =====
    console.log('Insertando edificios...');
    for (const edif of CONFIG.EDIFICIOS) {
      await query(
        `INSERT INTO edificios (clave, nombre, tipo)
         VALUES ($1, $2, $3) ON CONFLICT (clave) DO NOTHING`,
        [edif.clave, edif.nombre, edif.tipo]
      );
    }
    const edifRes = await query('SELECT id, clave FROM edificios');
    const edificioMap = {};
    edifRes.rows.forEach(e => { edificioMap[e.clave] = e.id; });

    // ===== 5. AULAS =====
    console.log('Insertando aulas...');
    for (const aula of CONFIG.AULAS) {
      const edificioId = edificioMap[aula.edificio];
      if (!edificioId) continue;
      await query(
        `INSERT INTO aulas (edificio_id, nombre, tipo, capacidad, activa)
         VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (edificio_id, nombre) DO NOTHING`,
        [edificioId, aula.nombre, aula.tipo, aula.capacidad]
      );
    }

    // ===== 6. PERIODOS_DIA =====
    console.log('Insertando periodos del dia...');
    const turnosRes = await query('SELECT id, nombre FROM turnos');
    const turnoMap = {};
    turnosRes.rows.forEach(t => { turnoMap[t.nombre] = t.id; });
    for (const periodo of CONFIG.PERIODOS_DIA) {
      const turnoId = turnoMap[periodo.turno];
      if (!turnoId) continue;
      await query(
        `INSERT INTO periodos_dia (turno_id, numero, hora_inicio, hora_fin)
         VALUES ($1, $2, $3, $4) ON CONFLICT (turno_id, numero) DO NOTHING`,
        [turnoId, periodo.numero, periodo.hora_inicio, periodo.hora_fin]
      );
    }

    // ===== 7. CONCEPTOS_PAGO =====
    console.log('Insertando conceptos de pago...');
    for (const concepto of CONFIG.CONCEPTOS_PAGO) {
      const existing = await query('SELECT id FROM conceptos_pago WHERE nombre = $1', [concepto.nombre]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO conceptos_pago (nombre, descripcion, precio, activo)
           VALUES ($1, $2, $3, TRUE)`,
          [concepto.nombre, concepto.nombre, concepto.precio]
        );
      }
    }

    // ===== 8. CATALOGO_DOCUMENTOS =====
    console.log('Insertando catalogo de documentos...');
    for (const doc of CONFIG.DOCUMENTOS) {
      await query(
        `INSERT INTO catalogo_documentos (clave, nombre, descripcion, etapa, obligatorio, precio)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (clave) DO NOTHING`,
        [doc.clave, doc.nombre, doc.nombre, doc.etapa, doc.obligatorio, doc.precio]
      );
    }

    // ===== 9. USUARIOS =====
    console.log('Insertando usuarios...');
    const hashedPassword = await bcrypt.hash('123456', 12);

    const adminExists = await query('SELECT id FROM usuarios WHERE rol = $1 LIMIT 1', ['administrador']);
    let adminId;
    if (adminExists.rows.length > 0) {
      adminId = adminExists.rows[0].id;
      console.log('   Admin ya existe, usando ID: ' + adminId);
    } else {
      const adminInsert = await query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (email) DO NOTHING RETURNING id`,
        ['Admin', 'Sistema', 'admin@cecyte.edu.mx', hashedPassword, 'administrador']
      );
      if (adminInsert.rows.length > 0) {
        adminId = adminInsert.rows[0].id;
        console.log('   Admin creado con ID: ' + adminId);
      } else {
        const existing = await query('SELECT id FROM usuarios WHERE email = $1', ['admin@cecyte.edu.mx']);
        adminId = existing.rows[0].id;
      }
    }

    // Insertar docentes (se usaran tanto para materias como para tutores)
    const docentes = [
      { nombre: 'Mario', apellidos: 'Garcia Perez', email: 'mario.garcia@cecyte.edu.mx' },
      { nombre: 'Maria', apellidos: 'Lopez Gomez', email: 'maria.lopez@cecyte.edu.mx' },
      { nombre: 'Juan', apellidos: 'Martinez Cruz', email: 'juan.martinez@cecyte.edu.mx' },
      { nombre: 'Ana', apellidos: 'Rodriguez Hernandez', email: 'ana.rodriguez@cecyte.edu.mx' },
      { nombre: 'Luis', apellidos: 'Gonzalez Flores', email: 'luis.gonzalez@cecyte.edu.mx' },
      { nombre: 'Carmen', apellidos: 'Reyes Ortiz', email: 'carmen.reyes@cecyte.edu.mx' }
    ];
    for (const docente of docentes) {
      await query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (email) DO NOTHING`,
        [docente.nombre, docente.apellidos, docente.email, hashedPassword, 'docente']
      );
    }

    // Obtener IDs de docentes (para materias y tutores)
    const docentesRes = await query('SELECT id, email FROM usuarios WHERE rol = $1', ['docente']);
    const docenteMap = {};
    docentesRes.rows.forEach(d => { docenteMap[d.email] = d.id; });

    // Alumnos de ejemplo
    const alumnosEjemplo = [
      { nombre: 'Pedro', apellidos: 'Gomez Lopez', email: 'pedro.gomez@cecyte.edu.mx', matricula: '2025001', especialidad: 'DGD', semestre: 1 },
      { nombre: 'Laura', apellidos: 'Garcia Romero', email: 'laura.garcia@cecyte.edu.mx', matricula: '2025002', especialidad: 'ELEC', semestre: 2 },
      { nombre: 'Jose', apellidos: 'Ramirez Perez', email: 'jose.ramirez@cecyte.edu.mx', matricula: '2025003', especialidad: 'PIA', semestre: 3 },
      { nombre: 'Sofia', apellidos: 'Martinez Cruz', email: 'sofia.martinez@cecyte.edu.mx', matricula: '2025004', especialidad: 'DGD', semestre: 4 },
      { nombre: 'Miguel', apellidos: 'Gonzalez Hernandez', email: 'miguel.gonzalez@cecyte.edu.mx', matricula: '2025005', especialidad: 'ELEC', semestre: 5 },
      { nombre: 'Fernanda', apellidos: 'Lopez Diaz', email: 'fernanda.lopez@cecyte.edu.mx', matricula: '2025006', especialidad: 'PIA', semestre: 6 }
    ];
    for (const alumno of alumnosEjemplo) {
      const userIdRes = await query(
        `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (email) DO NOTHING RETURNING id`,
        [alumno.nombre, alumno.apellidos, alumno.email, hashedPassword, 'alumno']
      );
      let userId;
      if (userIdRes.rows.length > 0) {
        userId = userIdRes.rows[0].id;
      } else {
        const existing = await query('SELECT id FROM usuarios WHERE email = $1', [alumno.email]);
        userId = existing.rows[0].id;
      }
      const espId = especialidadMap[alumno.especialidad];
      await query(
        `INSERT INTO alumnos (usuario_id, matricula, especialidad_id, semestre_actual, estatus)
         VALUES ($1, $2, $3, $4, 'activo') ON CONFLICT (matricula) DO NOTHING`,
        [userId, alumno.matricula, espId, alumno.semestre]
      );
    }

    // ===== 10. GRUPOS (CON TUTORES) =====
    console.log('Insertando grupos con tutores...');
    const gruposData = [];
    for (const semestre of CONFIG.SEMESTRES) {
      for (const turno of CONFIG.TURNOS) {
        for (const esp of CONFIG.ESPECIALIDADES) {
          let letras = [];
          if (esp.clave === 'DGD') letras = ['A', 'B'];
          else if (esp.clave === 'ELEC') letras = ['C'];
          else if (esp.clave === 'PIA') letras = ['D'];
          else continue;
          for (const letra of letras) {
            gruposData.push({
              ciclo_id: cicloId,
              especialidad_id: especialidadMap[esp.clave],
              turno_id: turno.id,
              semestre: semestre,
              letra: letra,
              activo: true,
              especialidad_clave: esp.clave
            });
          }
        }
      }
    }

    // Para cada especialidad, llevar un contador de tutores para rotar
    const tutorIndexMap = {};
    for (const esp of CONFIG.ESPECIALIDADES) {
      tutorIndexMap[esp.clave] = 0;
    }

    for (const grupo of gruposData) {
      // Obtener lista de tutores para esta especialidad
      const tutoresEmails = CONFIG.TUTORES_POR_ESPECIALIDAD[grupo.especialidad_clave] || [];
      let tutorId = null;
      if (tutoresEmails.length > 0) {
        // Rotar entre los tutores disponibles
        const idx = tutorIndexMap[grupo.especialidad_clave] % tutoresEmails.length;
        const email = tutoresEmails[idx];
        tutorId = docenteMap[email] || null;
        tutorIndexMap[grupo.especialidad_clave]++;
      }

      await query(
        `INSERT INTO grupos (ciclo_id, especialidad_id, turno_id, semestre, letra, tutor_id, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (ciclo_id, semestre, letra, turno_id) DO NOTHING`,
        [grupo.ciclo_id, grupo.especialidad_id, grupo.turno_id, grupo.semestre, grupo.letra, tutorId, grupo.activo]
      );
    }

    const gruposRes = await query('SELECT id, semestre, especialidad_id, turno_id FROM grupos WHERE ciclo_id = $1', [cicloId]);
    const gruposMap = gruposRes.rows;

    // ===== 11. MATERIAS CATALOGO =====
    console.log('Insertando materias catalogo...');

    for (const [sem, materias] of Object.entries(CONFIG.MATERIAS_TRONCALES_GENERALES)) {
      for (const mat of materias) {
        await query(
          `INSERT INTO materias_catalogo (nombre, clave, semestre, tipo, horas_semana, activa)
           VALUES ($1, $2, $3, 'troncal_general', $4, TRUE) ON CONFLICT (clave) DO NOTHING`,
          [mat.nombre, mat.clave, parseInt(sem), mat.horas]
        );
      }
    }

    for (const [clave, semestres] of Object.entries(CONFIG.MATERIAS_ESPECIALIDAD)) {
      const espId = especialidadMap[clave];
      if (!espId) continue;
      for (const [sem, materias] of Object.entries(semestres)) {
        for (const mat of materias) {
          const semNum = parseInt(sem);
          let tipo = 'troncal_especialidad';
          let modulo_numero = null;
          let submodulo_numero = null;

          if (semNum >= 2 && semNum <= 5) {
            const match = mat.clave.match(/M(\d+)-S(\d+)/);
            if (match) {
              modulo_numero = parseInt(match[1]);
              submodulo_numero = parseInt(match[2]);
              tipo = 'modulo';
            }
          }
          if (semNum === 6) {
            const match = mat.clave.match(/M(\d+)-S(\d+)/);
            if (match) {
              modulo_numero = parseInt(match[1]);
              submodulo_numero = parseInt(match[2]);
              tipo = 'modulo';
            }
          }

          await query(
            `INSERT INTO materias_catalogo (nombre, clave, semestre, tipo, especialidad_id, modulo_numero, submodulo_numero, horas_semana, activa)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) ON CONFLICT (clave) DO NOTHING`,
            [
              mat.nombre,
              mat.clave,
              semNum,
              tipo,
              espId,
              modulo_numero,
              submodulo_numero,
              mat.horas
            ]
          );
        }
      }
    }

    // ===== 12. ASIGNAR MATERIAS A GRUPOS =====
    console.log('Asignando materias a grupos...');
    const materiasCatalogo = await query('SELECT id, semestre, tipo, especialidad_id FROM materias_catalogo WHERE activa = TRUE');
    const materiasMap = materiasCatalogo.rows;

    const docentesIds = docentesRes.rows.map(d => d.id);
    let docenteIdx = 0;

    for (const grupo of gruposMap) {
      const { id: grupoId, semestre: grupoSemestre, especialidad_id: grupoEsp } = grupo;

      const generales = materiasMap.filter(m =>
        m.tipo === 'troncal_general' && m.semestre === grupoSemestre
      );
      for (const mat of generales) {
        const docente = docentesIds[docenteIdx % docentesIds.length];
        docenteIdx++;
        await query(
          `INSERT INTO materias_grupo (grupo_id, materia_catalogo_id, docente_id, ciclo_id, activa)
           VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (grupo_id, materia_catalogo_id, ciclo_id) DO NOTHING`,
          [grupoId, mat.id, docente, cicloId]
        );
      }

      const espMats = materiasMap.filter(m =>
        m.tipo === 'troncal_especialidad' &&
        m.semestre === grupoSemestre &&
        m.especialidad_id === grupoEsp
      );
      for (const mat of espMats) {
        const docente = docentesIds[docenteIdx % docentesIds.length];
        docenteIdx++;
        await query(
          `INSERT INTO materias_grupo (grupo_id, materia_catalogo_id, docente_id, ciclo_id, activa)
           VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (grupo_id, materia_catalogo_id, ciclo_id) DO NOTHING`,
          [grupoId, mat.id, docente, cicloId]
        );
      }

      const modulos = materiasMap.filter(m =>
        m.tipo === 'modulo' &&
        m.semestre === grupoSemestre &&
        m.especialidad_id === grupoEsp
      );
      for (const mat of modulos) {
        const docente = docentesIds[docenteIdx % docentesIds.length];
        docenteIdx++;
        await query(
          `INSERT INTO materias_grupo (grupo_id, materia_catalogo_id, docente_id, ciclo_id, activa)
           VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (grupo_id, materia_catalogo_id, ciclo_id) DO NOTHING`,
          [grupoId, mat.id, docente, cicloId]
        );
      }
    }

    // ===== 13. CALIFICACIONES DE EJEMPLO =====
    console.log('Insertando calificaciones de ejemplo...');
    const materiasGrupoRes = await query('SELECT id, grupo_id FROM materias_grupo WHERE ciclo_id = $1', [cicloId]);
    const materiasGrupo = materiasGrupoRes.rows || [];

    if (materiasGrupo.length === 0) {
      console.log('   No hay materias_grupo, omitiendo calificaciones de ejemplo.');
    } else {
      const alumnosRes = await query('SELECT id FROM alumnos WHERE grupo_actual_id IS NOT NULL');
      const alumnos = alumnosRes.rows || [];
      const adminUser = await query('SELECT id FROM usuarios WHERE rol = $1 LIMIT 1', ['administrador']);
      const adminUserId = adminUser.rows.length > 0 ? adminUser.rows[0].id : null;

      if (!adminUserId) {
        console.log('   No se encontro administrador, omitiendo calificaciones.');
      } else {
        for (const mg of materiasGrupo) {
          const grupoAlumnosRes = await query('SELECT a.id FROM alumnos a WHERE a.grupo_actual_id = $1', [mg.grupo_id]);
          const grupoAlumnos = grupoAlumnosRes.rows || [];
          for (const alumno of grupoAlumnos) {
            for (let parcial = 1; parcial <= 3; parcial++) {
              const calif = (Math.random() * 4 + 6).toFixed(1);
              await query(
                `INSERT INTO calificaciones (alumno_id, materia_grupo_id, ciclo_id, parcial, calificacion, tipo_evaluacion, registrado_por)
                 VALUES ($1, $2, $3, $4, $5, 'ordinaria', $6) ON CONFLICT (alumno_id, materia_grupo_id, ciclo_id, parcial) DO NOTHING`,
                [alumno.id, mg.id, cicloId, parcial, parseFloat(calif), adminUserId]
              );
            }
          }
        }
        console.log('   Calificaciones insertadas para ' + materiasGrupo.length + ' materias.');
      }
    }

    // ===== 14. COMUNICADOS =====
    console.log('Insertando comunicados...');
    await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id, fecha_publicacion, activo, dirigido_a_rol)
       VALUES ($1, $2, $3, NOW(), TRUE, $4)`,
      ['Bienvenida al ciclo 2025-2026', 'Les damos la bienvenida al nuevo ciclo escolar. Exito en sus estudios.', adminId, null]
    );
    await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id, fecha_publicacion, activo, dirigido_a_rol)
       VALUES ($1, $2, $3, NOW(), TRUE, $4)`,
      ['Aviso: Fechas de evaluaciones parciales', 'Recuerden que las evaluaciones parciales seran del 1 al 5 de cada mes. Consulte el calendario escolar.', adminId, 'docente']
    );
    await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id, fecha_publicacion, activo, dirigido_a_rol)
       VALUES ($1, $2, $3, NOW(), TRUE, $4)`,
      ['Recordatorio de entrega de documentos', 'Los aspirantes deben entregar su documentacion antes del 30 de junio.', adminId, 'alumno']
    );

    // ===== 15. CONFIGURACION DE HORARIOS =====
    console.log('Insertando configuracion de horarios...');
    await query(
      `INSERT INTO configuracion_horarios (duracion_bloque_minutos, hora_inicio_turno, hora_fin_turno, receso_inicio, receso_fin, receso_bloqueado, dias_semana)
       VALUES (50, '07:00', '14:10', '09:30', '10:00', FALSE, ARRAY['Lunes','Martes','Miercoles','Jueves','Viernes']) ON CONFLICT (id) DO NOTHING`
    );

    console.log('Seeding completado exitosamente.');
  } catch (error) {
    console.error('Error durante el seeding:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSeed();