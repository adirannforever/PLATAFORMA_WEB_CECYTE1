// utils/excelGenerator.js
import ExcelJS from 'exceljs';

// Estilo de encabezados (reutilizable)
const headerStyle = {
  font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6B35' } },
  border: {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  },
  alignment: { horizontal: 'center', vertical: 'middle' },
};

// ============================================================
// LISTADO DE ALUMNOS
// ============================================================
export const generarListadoAlumnosExcel = async (alumnos) => {
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

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => Object.assign(cell, headerStyle));

  alumnos.forEach(alumno => {
    const row = worksheet.addRow(alumno);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return await workbook.xlsx.writeBuffer();
};

// ============================================================
// ESTADÍSTICAS (corregido con porcentaje real)
// ============================================================
export const generarEstadisticasExcel = async (stats) => {
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

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => Object.assign(cell, headerStyle));

  stats.forEach(row => {
    const total = parseInt(row.total_alumnos) || 0;
    const aprobados = parseInt(row.aprobados) || 0;
    const porcentaje = total > 0 ? Math.round((aprobados / total) * 100) : 0;
    const dataRow = worksheet.addRow({
      ...row,
      promedio_materia: parseFloat(row.promedio_materia) || 0,
      porcentaje_aprobacion: `${porcentaje}%`,
    });
    dataRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return await workbook.xlsx.writeBuffer();
};

// ============================================================
// ASISTENCIAS DE CLASE
// ============================================================
export const generarExcelAsistenciasClase = async (info, asistencias) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asistencias');

  // Título y encabezados
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = `Asistencias - ${info.materia_nombre}`;
  worksheet.getCell('A1').font = { size: 14, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = `Grupo: ${info.grupo_nombre} (${info.grupo_letra}) - Ciclo: ${info.ciclo_nombre}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A3:E3');
  const fechaObj = new Date(info.fecha);
  worksheet.getCell('A3').value = `Fecha: ${fechaObj.toLocaleDateString('es-MX')}`;
  worksheet.getCell('A3').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A4:E4');
  worksheet.getCell('A4').value = `Exportado: ${new Date().toLocaleString('es-MX')}`;
  worksheet.getCell('A4').alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['Alumno', 'Matrícula', 'Estado', 'Justificación', '']);
  const headerStyleLocal = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6B35' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  headerRow.eachCell(cell => Object.assign(cell, headerStyleLocal));

  if (asistencias.length === 0) {
    const emptyRow = worksheet.addRow(['No hay asistencias registradas para esta fecha', '', '', '', '']);
    emptyRow.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    worksheet.mergeCells(`A5:E5`);
  } else {
    asistencias.forEach(alumno => {
      const row = worksheet.addRow([
        `${alumno.apellidos}, ${alumno.nombre}`,
        alumno.matricula || 'N/A',
        alumno.estado,
        alumno.justificacion || '',
        '',
      ]);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      });
    });
  }

  worksheet.getColumn(1).width = 30;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 25;
  worksheet.getColumn(5).width = 5;

  return await workbook.xlsx.writeBuffer();
};