import { query } from '../config/db.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// ============================================================
// SERVICIO: Boleta de calificaciones (PDF)
// ============================================================
export async function generarBoletaPDF(alumnoId, cicloId) {
  // Obtener datos del alumno
  const alumno = await query(
    `SELECT a.id, a.matricula, a.semestre_actual, a.estatus,
            u.nombre, u.apellidos,
            g.nombre AS grupo_nombre, g.letra AS grupo_letra,
            e.nombre AS especialidad_nombre,
            c.nombre AS ciclo_nombre
     FROM alumnos a
     JOIN usuarios u ON u.id = a.usuario_id
     LEFT JOIN grupos g ON g.id = a.grupo_actual_id
     LEFT JOIN especialidades e ON e.id = g.especialidad_id
     LEFT JOIN ciclos_escolares c ON c.id = $2
     WHERE a.id = $1`,
    [alumnoId, cicloId]
  );

  if (!alumno.rows[0]) {
    throw new Error('Alumno no encontrado');
  }

  const alumnoData = alumno.rows[0];

  // Obtener calificaciones del alumno en este ciclo (solo ordinarias)
  const calificaciones = await query(
    `SELECT 
      mc.nombre AS materia_nombre,
      c.parcial,
      c.calificacion
     FROM calificaciones c
     JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
     JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
     WHERE c.alumno_id = $1 AND c.ciclo_id = $2 AND c.tipo_evaluacion = 'ordinaria'
     ORDER BY mc.nombre, c.parcial`,
    [alumnoId, cicloId]
  );

  // Agrupar por materia
  const materiasMap = {};
  calificaciones.rows.forEach(row => {
    if (!materiasMap[row.materia_nombre]) {
      materiasMap[row.materia_nombre] = {
        nombre: row.materia_nombre,
        parciales: {},
      };
    }
    // Guardar solo si la calificación es un número válido
    const calif = parseFloat(row.calificacion);
    if (!isNaN(calif)) {
      materiasMap[row.materia_nombre].parciales[row.parcial] = calif;
    }
  });

  const materias = Object.values(materiasMap);

  // Calcular promedios por materia (solo con valores numéricos)
  materias.forEach(m => {
    const valores = Object.values(m.parciales).filter(v => !isNaN(v) && v !== null && v !== undefined);
    if (valores.length > 0) {
      const suma = valores.reduce((a, b) => a + b, 0);
      m.promedio = Math.round((suma / valores.length) * 10) / 10;
    } else {
      m.promedio = null; // sin calificaciones
    }
  });

  // Promedio general (solo materias que tengan al menos un parcial)
  const materiasConPromedio = materias.filter(m => m.promedio !== null && !isNaN(m.promedio));
  const promedioGeneral = materiasConPromedio.length > 0
    ? Math.round((materiasConPromedio.reduce((a, b) => a + b.promedio, 0) / materiasConPromedio.length) * 10) / 10
    : null;

  // Generar PDF
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // Header
  doc.fontSize(16).text('BOLETA DE CALIFICACIONES', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Alumno: ${alumnoData.apellidos}, ${alumnoData.nombre}`);
  doc.text(`Matrícula: ${alumnoData.matricula}`);
  doc.text(`Semestre: ${alumnoData.semestre_actual}°`);
  doc.text(`Grupo: ${alumnoData.grupo_nombre || 'Sin grupo'}`);
  doc.text(`Especialidad: ${alumnoData.especialidad_nombre || 'Sin especialidad'}`);
  doc.text(`Ciclo: ${alumnoData.ciclo_nombre || 'Sin ciclo'}`);
  doc.text(`Estatus: ${alumnoData.estatus}`);
  doc.moveDown();

  if (materias.length === 0 || materias.every(m => Object.keys(m.parciales).length === 0)) {
    doc.fontSize(12).text('El alumno no tiene calificaciones registradas en este ciclo.', { align: 'center' });
    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
  }

  // Tabla de materias
  const tableTop = doc.y;
  let y = tableTop;

  doc.fontSize(9);
  doc.text('Materia', 50, y, { width: 200 });
  doc.text('P1', 250, y, { width: 40, align: 'center' });
  doc.text('P2', 290, y, { width: 40, align: 'center' });
  doc.text('P3', 330, y, { width: 40, align: 'center' });
  doc.text('Promedio', 370, y, { width: 80, align: 'right' });
  y += 20;

  materias.forEach(m => {
    const p1 = (m.parciales[1] !== undefined && !isNaN(m.parciales[1])) ? m.parciales[1] : '-';
    const p2 = (m.parciales[2] !== undefined && !isNaN(m.parciales[2])) ? m.parciales[2] : '-';
    const p3 = (m.parciales[3] !== undefined && !isNaN(m.parciales[3])) ? m.parciales[3] : '-';
    const prom = (m.promedio !== null && !isNaN(m.promedio)) ? m.promedio : '-';

    doc.text(m.nombre.substring(0, 30), 50, y, { width: 200 });
    doc.text(String(p1), 250, y, { width: 40, align: 'center' });
    doc.text(String(p2), 290, y, { width: 40, align: 'center' });
    doc.text(String(p3), 330, y, { width: 40, align: 'center' });
    doc.text(String(prom), 370, y, { width: 80, align: 'right' });
    y += 18;
  });

  y += 10;
  doc.fontSize(10);
  const promedioTexto = (promedioGeneral !== null && !isNaN(promedioGeneral)) ? promedioGeneral : 'Sin calificaciones';
  doc.text(`Promedio General: ${promedioTexto}`, 50, y);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
  });
}

// ============================================================
// SERVICIO: Constancia de estudios (PDF)
// ============================================================
export async function generarConstanciaPDF(alumnoId) {
  const alumno = await query(
    `SELECT a.id, a.matricula, a.semestre_actual,
            u.nombre, u.apellidos,
            g.nombre AS grupo_nombre, g.letra AS grupo_letra,
            e.nombre AS especialidad_nombre
     FROM alumnos a
     JOIN usuarios u ON u.id = a.usuario_id
     LEFT JOIN grupos g ON g.id = a.grupo_actual_id
     LEFT JOIN especialidades e ON e.id = g.especialidad_id
     WHERE a.id = $1`,
    [alumnoId]
  );

  if (!alumno.rows[0]) {
    throw new Error('Alumno no encontrado');
  }

  const data = alumno.rows[0];

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  doc.fontSize(16).text('CONSTANCIA DE ESTUDIOS', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12);
  doc.text(`La Dirección del CECyTE Plantel 1 hace constar que:`);
  doc.moveDown();
  doc.text(`Nombre: ${data.apellidos}, ${data.nombre}`);
  doc.text(`Matrícula: ${data.matricula}`);
  doc.text(`Semestre actual: ${data.semestre_actual}°`);
  doc.text(`Especialidad: ${data.especialidad_nombre || 'Sin especialidad'}`);
  doc.text(`Grupo: ${data.grupo_nombre || 'Sin grupo'}`);
  doc.moveDown();
  doc.text('Se expide la presente constancia para los fines que el interesado estime convenientes.');
  doc.moveDown(2);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
  });
}

// ============================================================
// SERVICIO: Listado de alumnos (Excel)
// ============================================================
export async function generarListadoAlumnosExcel(filtros = {}) {
  const { grupo_id, especialidad_id, semestre, estatus, grupo_ids } = filtros;

  let sql = `
    SELECT 
      a.matricula,
      u.nombre,
      u.apellidos,
      a.semestre_actual,
      g.nombre AS grupo_nombre,
      g.letra AS grupo_letra,
      e.nombre AS especialidad_nombre,
      a.estatus
    FROM alumnos a
    JOIN usuarios u ON u.id = a.usuario_id
    LEFT JOIN grupos g ON g.id = a.grupo_actual_id
    LEFT JOIN especialidades e ON e.id = a.especialidad_id
    WHERE 1=1
  `;
  const params = [];

  if (grupo_id) {
    sql += ` AND a.grupo_actual_id = $${params.length + 1}`;
    params.push(grupo_id);
  }
  if (especialidad_id) {
    sql += ` AND a.especialidad_id = $${params.length + 1}`;
    params.push(especialidad_id);
  }
  if (semestre) {
    sql += ` AND a.semestre_actual = $${params.length + 1}`;
    params.push(semestre);
  }
  if (estatus) {
    sql += ` AND a.estatus = $${params.length + 1}`;
    params.push(estatus);
  }
  if (grupo_ids && Array.isArray(grupo_ids) && grupo_ids.length > 0) {
    // grupo_ids viene del controlador cuando es docente
    sql += ` AND a.grupo_actual_id = ANY($${params.length + 1}::int[])`;
    params.push(grupo_ids);
  }
  sql += ' ORDER BY a.semestre_actual, g.letra, u.apellidos';

  const result = await query(sql, params);
  const alumnos = result.rows;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Alumnos');

  worksheet.columns = [
    { header: 'Matrícula', key: 'matricula', width: 15 },
    { header: 'Apellidos', key: 'apellidos', width: 25 },
    { header: 'Nombre', key: 'nombre', width: 25 },
    { header: 'Semestre', key: 'semestre_actual', width: 12 },
    { header: 'Grupo', key: 'grupo_nombre', width: 20 },
    { header: 'Letra', key: 'grupo_letra', width: 10 },
    { header: 'Especialidad', key: 'especialidad_nombre', width: 30 },
    { header: 'Estatus', key: 'estatus', width: 15 },
  ];

  alumnos.forEach(alumno => {
    worksheet.addRow(alumno);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// ============================================================
// SERVICIO: Estadísticas de rendimiento (Excel)
// ============================================================
export async function generarEstadisticasExcel(cicloId, grupoId = null) {
  let sql = `
    SELECT 
      g.id AS grupo_id,
      g.nombre AS grupo_nombre,
      g.letra AS grupo_letra,
      mc.nombre AS materia_nombre,
      COUNT(DISTINCT c.alumno_id) AS total_alumnos,
      ROUND(AVG(c.calificacion), 2) AS promedio_materia,
      COUNT(CASE WHEN c.calificacion >= 6 THEN 1 END) AS aprobados,
      COUNT(CASE WHEN c.calificacion < 6 THEN 1 END) AS reprobados
    FROM calificaciones c
    JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
    JOIN grupos g ON g.id = mg.grupo_id
    JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
    WHERE c.ciclo_id = $1 AND c.tipo_evaluacion = 'ordinaria'
  `;
  const params = [cicloId];

  if (grupoId) {
    sql += ` AND g.id = $${params.length + 1}`;
    params.push(grupoId);
  }

  sql += ` GROUP BY g.id, g.nombre, g.letra, mc.nombre ORDER BY g.nombre, mc.nombre`;

  const result = await query(sql, params);
  const stats = result.rows;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Estadísticas');

  worksheet.columns = [
    { header: 'Grupo', key: 'grupo_nombre', width: 20 },
    { header: 'Letra', key: 'grupo_letra', width: 10 },
    { header: 'Materia', key: 'materia_nombre', width: 30 },
    { header: 'Total Alumnos', key: 'total_alumnos', width: 15 },
    { header: 'Promedio', key: 'promedio_materia', width: 15 },
    { header: 'Aprobados', key: 'aprobados', width: 15 },
    { header: 'Reprobados', key: 'reprobados', width: 15 },
    { header: '% Aprobación', key: 'porcentaje_aprobacion', width: 15 },
  ];

  stats.forEach(row => {
    const porcentaje = row.total_alumnos > 0
      ? Math.round((row.aprobados / row.total_alumnos) * 100)
      : 0;
    worksheet.addRow({
      ...row,
      porcentaje_aprobacion: `${porcentaje}%`,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}