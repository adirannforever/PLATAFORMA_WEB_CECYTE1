import dotenv from 'dotenv';
dotenv.config();

import pool, { query } from '../src/config/db.js';

// Aspirantes de prueba: cubren los 7 estatus para demostrar todos los badges.
// Se insertan en la BD real (Neon) que usa la app. Idempotente por folio (UNIQUE).
const ASPIRANTES = [
  { folio: 'ASP-100001', nombre: 'Ana',       apellidos: 'Hernandez Lopez', curp: 'HELA030512MDFRNR08', email: 'ana.hernandez@aspirante.cecyte.edu.mx',  telefono: '5512340001', especialidad: 'DGD',  turno: 'Matutino',  estatus: 'registrado' },
  { folio: 'ASP-100002', nombre: 'Carlos',    apellidos: 'Ramirez Perez',   curp: 'RAPE040220HDFRRL05', email: 'carlos.ramirez@aspirante.cecyte.edu.mx',  telefono: '5512340002', especialidad: 'ELEC', turno: 'Matutino',  estatus: 'documentos_pendientes' },
  { folio: 'ASP-100003', nombre: 'Diana',     apellidos: 'Torres Gomez',    curp: 'TOGD040915MDFRRR03', email: 'diana.torres@aspirante.cecyte.edu.mx',    telefono: '5512340003', especialidad: 'PIA',  turno: 'Vespertino', estatus: 'ficha_pagada' },
  { folio: 'ASP-100004', nombre: 'Eduardo',   apellidos: 'Garcia Mata',     curp: 'GAMA040110HDFMCS04', email: 'eduardo.garcia@aspirante.cecyte.edu.mx',  telefono: '5512340004', especialidad: 'ELEC', turno: 'Matutino',  estatus: 'examen_aprobado' },
  { folio: 'ASP-100005', nombre: 'Fernanda',  apellidos: 'Lopez Mora',      curp: 'LOMA031208MDFNPS09', email: 'fernanda.lopez@aspirante.cecyte.edu.mx',  telefono: '5512340005', especialidad: 'DGD',  turno: 'Vespertino', estatus: 'aceptado' },
  { folio: 'ASP-100006', nombre: 'Jorge',     apellidos: 'Munoz Espinoza',  curp: 'MUJE031122HDFNCS07', email: 'jorge.munoz@aspirante.cecyte.edu.mx',     telefono: '5512340006', especialidad: 'PIA',  turno: 'Matutino',  estatus: 'rechazado' },
  { folio: 'ASP-100007', nombre: 'Carolina',  apellidos: 'Sanchez Cruz',    curp: 'SACA030714MDFNRR02', email: 'carolina.sanchez@aspirante.cecyte.edu.mx', telefono: '5512340007', especialidad: 'ELEC', turno: 'Vespertino', estatus: 'inscrito' },
];

async function main() {
  console.log('Sembrando aspirantes de prueba...');

  const espRes = await query('SELECT id, clave FROM especialidades');
  const espMap = {};
  espRes.rows.forEach((r) => { espMap[r.clave] = r.id; });

  const turnRes = await query('SELECT id, nombre FROM turnos');
  const turnMap = {};
  turnRes.rows.forEach((r) => { turnMap[r.nombre] = r.id; });

  const cicloRes = await query('SELECT id FROM ciclos_escolares WHERE activo = TRUE ORDER BY id DESC LIMIT 1');
  const cicloId = cicloRes.rows[0]?.id;
  if (!cicloId) {
    console.error('No hay ciclo escolar activo. Corre primero `npm run db:seed`.');
    process.exit(1);
  }

  for (const a of ASPIRANTES) {
    const espId = espMap[a.especialidad];
    const turnId = turnMap[a.turno];
    if (!espId || !turnId) {
      console.log(`  * ${a.folio}: catálogo faltante (${a.especialidad}/${a.turno}), omitido`);
      continue;
    }
    const res = await query(
      `INSERT INTO aspirantes (folio, nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id, estatus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (folio) DO NOTHING RETURNING id, folio`,
      [a.folio, a.nombre, a.apellidos, a.curp, a.email, a.telefono, espId, turnId, cicloId, a.estatus]
    );
    if (res.rows.length > 0) {
      console.log(`  + ${res.rows[0].folio} (id ${res.rows[0].id}) -> ${a.estatus}`);
    } else {
      console.log(`  = ${a.folio} ya existía, omitido`);
    }
  }

  const total = await query('SELECT COUNT(*) AS n FROM aspirantes');
  console.log(`Total de aspirantes en la BD: ${total.rows[0].n}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error sembrando aspirantes:', err.message);
  process.exit(1);
});
