import { query } from '../config/db.js';
import { generarBoletaPDF, generarConstanciaPDF } from '../utils/pdfGenerator.js';
import {
  generarListadoAlumnosExcel,
  generarEstadisticasExcel,
  generarExcelAsistenciasClase,
} from '../utils/excelGenerator.js';




export async function generarBoletaPDFService(alumnoId, cicloId, filtros = {}) {
  const { parciales = [1, 2, 3] } = filtros;

  
  const alumnoRes = await query(
    `SELECT a.id, a.matricula, a.semestre_actual, a.estatus,
            u.nombre, u.apellidos,
            g.id AS grupo_actual_id,
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
  if (!alumnoRes.rows[0]) throw new Error('Alumno no encontrado');
  const alumnoData = alumnoRes.rows[0];

  
  const califRes = await query(
    `SELECT mc.nombre AS materia_nombre, c.parcial, c.calificacion
     FROM calificaciones c
     JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
     JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
     WHERE c.alumno_id = $1 AND c.ciclo_id = $2 
       AND c.tipo_evaluacion = 'ordinaria'
       AND c.parcial = ANY($3)
     ORDER BY mc.nombre, c.parcial`,
    [alumnoId, cicloId, parciales]
  );

  
  let materiasMap = {};
  if (alumnoData.grupo_actual_id) {
    const materiasRes = await query(
      `SELECT mc.nombre AS materia_nombre
       FROM materias_grupo mg
       JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
       WHERE mg.grupo_id = $1 AND mg.ciclo_id = $2 AND mg.activa = TRUE
       ORDER BY mc.nombre`,
      [alumnoData.grupo_actual_id, cicloId]
    );
    materiasRes.rows.forEach(row => {
      materiasMap[row.materia_nombre] = {
        nombre: row.materia_nombre,
        parciales: {},
      };
      parciales.forEach(p => {
        materiasMap[row.materia_nombre].parciales[p] = null;
      });
    });
  }

  
  if (Object.keys(materiasMap).length === 0) {
    
    califRes.rows.forEach(row => {
      const calif = parseFloat(row.calificacion);
      if (!isNaN(calif)) {
        if (!materiasMap[row.materia_nombre]) {
          materiasMap[row.materia_nombre] = {
            nombre: row.materia_nombre,
            parciales: {},
          };
          parciales.forEach(p => {
            materiasMap[row.materia_nombre].parciales[p] = null;
          });
        }
        materiasMap[row.materia_nombre].parciales[row.parcial] = calif;
      }
    });
  } else {
    califRes.rows.forEach(row => {
      const calif = parseFloat(row.calificacion);
      if (!isNaN(calif) && materiasMap[row.materia_nombre]) {
        materiasMap[row.materia_nombre].parciales[row.parcial] = calif;
      }
    });
  }

  const materias = Object.values(materiasMap);

  
  materias.forEach(m => {
    const valores = Object.values(m.parciales).filter(v => v !== null && !isNaN(v));
    m.promedio = valores.length > 0 ? Math.round((valores.reduce((a,b) => a+b, 0) / valores.length) * 10) / 10 : null;
  });

  const materiasConPromedio = materias.filter(m => m.promedio !== null);
  const promedioGeneral = materiasConPromedio.length > 0
    ? Math.round((materiasConPromedio.reduce((a,b) => a + b.promedio, 0) / materiasConPromedio.length) * 10) / 10
    : null;

  
  const p1Values = materias.map(m => m.parciales[1]).filter(v => v !== null && !isNaN(v));
  const p2Values = materias.map(m => m.parciales[2]).filter(v => v !== null && !isNaN(v));
  const p3Values = materias.map(m => m.parciales[3]).filter(v => v !== null && !isNaN(v));

  const p1Prom = p1Values.length ? Math.round((p1Values.reduce((a,b) => a+b, 0) / p1Values.length) * 10) / 10 : null;
  const p2Prom = p2Values.length ? Math.round((p2Values.reduce((a,b) => a+b, 0) / p2Values.length) * 10) / 10 : null;
  const p3Prom = p3Values.length ? Math.round((p3Values.reduce((a,b) => a+b, 0) / p3Values.length) * 10) / 10 : null;

  const promediosParciales = { p1Prom, p2Prom, p3Prom };

  
  if (materias.length === 0) {
    return await generarBoletaPDF(alumnoData, [], null, promediosParciales);
  }
  return await generarBoletaPDF(alumnoData, materias, promedioGeneral, promediosParciales);
}




export async function generarConstanciaPDFService(alumnoId, tipo = 'estudios') {
  const alumnoRes = await query(
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
  if (!alumnoRes.rows[0]) throw new Error('Alumno no encontrado');
  return await generarConstanciaPDF(alumnoRes.rows[0], tipo);
}




export async function generarListadoAlumnosExcelService(filtros = {}) {
  const { grupo_id, especialidad_id, semestre, estatus } = filtros;
  let sql = `SELECT a.matricula, u.nombre, u.apellidos, a.semestre_actual,
                    g.nombre AS grupo_nombre, g.letra AS grupo_letra,
                    e.nombre AS especialidad_nombre, a.estatus
             FROM alumnos a
             JOIN usuarios u ON u.id = a.usuario_id
             LEFT JOIN grupos g ON g.id = a.grupo_actual_id
             LEFT JOIN especialidades e ON e.id = a.especialidad_id
             WHERE 1=1`;
  const params = [];
  if (grupo_id) { sql += ` AND a.grupo_actual_id = $${params.length+1}`; params.push(grupo_id); }
  if (especialidad_id) { sql += ` AND a.especialidad_id = $${params.length+1}`; params.push(especialidad_id); }
  if (semestre) { sql += ` AND a.semestre_actual = $${params.length+1}`; params.push(semestre); }
  if (estatus) { sql += ` AND a.estatus = $${params.length+1}`; params.push(estatus); }
  sql += ' ORDER BY a.semestre_actual, g.letra, u.apellidos';
  const result = await query(sql, params);
  return await generarListadoAlumnosExcel(result.rows);
}




export async function generarEstadisticasExcelService(cicloId, grupoId = null) {
  let sql = `
    WITH promedios_alumno AS (
      SELECT c.alumno_id, mg.grupo_id, mg.materia_catalogo_id, AVG(c.calificacion) AS promedio_alumno
      FROM calificaciones c
      JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
      WHERE c.ciclo_id = $1 AND c.tipo_evaluacion = 'ordinaria' AND c.parcial IS NOT NULL
      GROUP BY c.alumno_id, mg.grupo_id, mg.materia_catalogo_id
    ),
    materias_info AS (
      SELECT g.id AS grupo_id, g.nombre AS grupo_nombre, g.letra AS grupo_letra,
             mc.id AS materia_id, mc.nombre AS materia_nombre
      FROM grupos g
      JOIN materias_grupo mg ON mg.grupo_id = g.id
      JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
      WHERE mg.ciclo_id = $1
    )
    SELECT mi.grupo_nombre, mi.grupo_letra, mi.materia_nombre,
           COUNT(pa.alumno_id) AS total_alumnos,
           COALESCE(ROUND(AVG(pa.promedio_alumno),2),0) AS promedio_materia,
           COUNT(CASE WHEN pa.promedio_alumno >= 6 THEN 1 END) AS aprobados,
           COUNT(CASE WHEN pa.promedio_alumno < 6 THEN 1 END) AS reprobados
    FROM materias_info mi
    LEFT JOIN promedios_alumno pa ON pa.grupo_id = mi.grupo_id AND pa.materia_catalogo_id = mi.materia_id
    WHERE 1=1
  `;
  const params = [cicloId];
  if (grupoId) { sql += ` AND mi.grupo_id = $${params.length+1}`; params.push(grupoId); }
  sql += ` GROUP BY mi.grupo_nombre, mi.grupo_letra, mi.materia_nombre
           ORDER BY mi.grupo_nombre, mi.materia_nombre`;
  const result = await query(sql, params);
  return await generarEstadisticasExcel(result.rows);
}




export async function generarExcelAsistenciasClaseService(materia_grupo_id, fecha) {
  const materiaInfo = await query(
    `SELECT mg.id, mc.nombre AS materia_nombre, g.nombre AS grupo_nombre, g.letra AS grupo_letra, c.nombre AS ciclo_nombre
     FROM materias_grupo mg
     JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
     JOIN grupos g ON g.id = mg.grupo_id
     JOIN ciclos_escolares c ON c.id = mg.ciclo_id
     WHERE mg.id = $1`,
    [materia_grupo_id]
  );
  if (materiaInfo.rows.length === 0) throw new Error('Materia no encontrada');
  const info = materiaInfo.rows[0];
  info.fecha = fecha;

  const result = await query(
    `SELECT a.id, u.nombre, u.apellidos, a.matricula, ac.estado, ac.justificacion
     FROM asistencia_clase ac
     JOIN alumnos a ON a.id = ac.alumno_id
     JOIN usuarios u ON u.id = a.usuario_id
     WHERE ac.materia_grupo_id = $1 AND ac.fecha = $2
     ORDER BY u.apellidos, u.nombre`,
    [materia_grupo_id, fecha]
  );
  return await generarExcelAsistenciasClase(info, result.rows);
}