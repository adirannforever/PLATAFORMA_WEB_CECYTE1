
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let logoBase64 = null;

const getLogoBase64 = () => {
  if (logoBase64) return logoBase64;
  try {
    const logoPath = path.join(__dirname, '../assets/logo_cecyte.png');
    if (fs.existsSync(logoPath)) {
      const imageBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      return logoBase64;
    }
    return null;
  } catch {
    return null;
  }
};

export const generarBoletaPDF = async (alumnoData, materias, promedioGeneral, promediosParciales = {}) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const logo = getLogoBase64();

  
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .strokeColor('#1A6B35').lineWidth(2).stroke();
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
     .strokeColor('#1A6B35').lineWidth(0.5).stroke();

  
  if (logo) {
    try {
      doc.opacity(0.08);
      doc.image(logo, (doc.page.width - 350) / 2, (doc.page.height - 350) / 2, { width: 350 });
      doc.opacity(1);
    } catch {}
  }

  
  if (logo) {
    try { doc.image(logo, 50, 45, { width: 60 }); } catch {}
  }

  
  doc.y = 55;
  doc.fontSize(16).font('Helvetica-Bold').fillColor('black').text('BOLETA DE CALIFICACIONES', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#333333').text('CECyTE Plantel 1 - Poblado Aquiles Serdán, Macuspana', { align: 'center' });
  
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1A6B35').lineWidth(1.5).stroke();
  doc.moveDown(1.5);

  
  doc.fillColor('black');
  
  const labelX1 = 55;
  const valueX1 = 115;
  const labelX2 = 320;
  const valueX2 = 395;
  
  let currentY = doc.y;
  const rowHeight = 22; 

  doc.fontSize(10);
  
  
  doc.font('Helvetica-Bold').text('Alumno:', labelX1, currentY);
  doc.font('Helvetica').text(`${alumnoData.apellidos}, ${alumnoData.nombre}`, valueX1, currentY);
  
  
  currentY += rowHeight;
  doc.font('Helvetica-Bold').text('Matrícula:', labelX1, currentY);
  doc.font('Helvetica').text(`${alumnoData.matricula}`, valueX1, currentY);
  doc.font('Helvetica-Bold').text('Semestre:', labelX2, currentY);
  doc.font('Helvetica').text(`${alumnoData.semestre_actual}°`, valueX2, currentY);
  
  
  currentY += rowHeight;
  doc.font('Helvetica-Bold').text('Grupo:', labelX1, currentY);
  doc.font('Helvetica').text(`${alumnoData.grupo_nombre || 'Sin grupo'}`, valueX1, currentY);
  doc.font('Helvetica-Bold').text('Especialidad:', labelX2, currentY);
  
  
  doc.font('Helvetica').text(`${alumnoData.especialidad_nombre || 'Sin especialidad'}`, valueX2, currentY, { width: 140 });
  
  
  
  currentY += rowHeight + 15; 
  
  doc.font('Helvetica-Bold').text('Ciclo:', labelX1, currentY);
  doc.font('Helvetica').text(`${alumnoData.ciclo_nombre || 'Sin ciclo'}`, valueX1, currentY);
  doc.font('Helvetica-Bold').text('Estatus:', labelX2, currentY);
  
  const estatusColor = alumnoData.estatus === 'activo' ? '#1A6B35' : '#b91c1c';
  doc.fillColor(estatusColor).font('Helvetica-Bold').text(`${alumnoData.estatus.toUpperCase()}`, valueX2, currentY);
  doc.fillColor('black');

  
  doc.y = currentY + 30;
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1A6B35').lineWidth(0.8).stroke();
  doc.moveDown(1.5);

  
  if (materias.length === 0) {
    doc.fontSize(12).fillColor('#333333').text('El alumno no tiene calificaciones registradas en este ciclo.', { align: 'center' });
  } else {
    const tableX = 55;
    let tableY = doc.y;
    const colWidths = [210, 55, 55, 55, 80];
    const colPos = [tableX, tableX+210, tableX+265, tableX+320, tableX+375];

    
    doc.rect(tableX, tableY, 485, 22).fillColor('#1A6B35').fill();
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
    ['Materia','Parcial 1','Parcial 2','Parcial 3','Promedio'].forEach((h,i) => {
      const align = i===0 ? 'left' : 'center';
      const xOff = i===0 ? 10 : 0;
      doc.text(h, colPos[i] + xOff, tableY+6, { width: colWidths[i] - (i===0?20:0), align });
    });
    tableY += 22;

    
    let rowIndex = 0;
    materias.forEach(m => {
      if (rowIndex % 2 === 0) {
        doc.rect(tableX, tableY, 485, 20).fillColor('#f8fafc').fill();
      }
      doc.fillColor('black').font('Helvetica').fontSize(9);
      doc.text(m.nombre, colPos[0]+10, tableY+5, { width: colWidths[0]-20, lineBreak: false });
      [m.parciales[1]||'-', m.parciales[2]||'-', m.parciales[3]||'-', m.promedio||'-'].forEach((val, i) => {
        doc.text(String(val), colPos[i+1], tableY+5, { width: colWidths[i+1], align: 'center' });
      });
      tableY += 20;
      rowIndex++;
    });

    
    const { p1Prom = null, p2Prom = null, p3Prom = null } = promediosParciales || {};
    doc.rect(tableX, tableY, 485, 22).fillColor('#e6f0ea').fill();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('Promedio por parcial', colPos[0]+10, tableY+6, { width: colWidths[0]-20 });
    doc.text(p1Prom !== null ? p1Prom.toFixed(1) : '-', colPos[1], tableY+6, { width: colWidths[1], align: 'center' });
    doc.text(p2Prom !== null ? p2Prom.toFixed(1) : '-', colPos[2], tableY+6, { width: colWidths[2], align: 'center' });
    doc.text(p3Prom !== null ? p3Prom.toFixed(1) : '-', colPos[3], tableY+6, { width: colWidths[3], align: 'center' });
    doc.text('', colPos[4], tableY+6, { width: colWidths[4], align: 'center' });
    tableY += 22;

    doc.moveTo(tableX, tableY).lineTo(tableX+485, tableY).strokeColor('#1A6B35').lineWidth(1).stroke();
    doc.y = tableY + 20;

    
    doc.fontSize(12).font('Helvetica-Bold');
    if (promedioGeneral !== null) {
      const color = promedioGeneral >= 6 ? '#1A6B35' : '#b91c1c';
      doc.fillColor(color).text(`Promedio General del Alumno: ${promedioGeneral.toFixed(1)}`, tableX, doc.y);
    } else {
      doc.fillColor('#333333').text('Promedio General: Sin calificaciones suficientes', tableX, doc.y);
    }
  }

  doc.y = 720;
  doc.fontSize(10).font('Helvetica').text(
    `Fecha de emisión: Macuspana, Tabasco a ${new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })}`, 
    { align: 'center' }
  );
  
  doc.y = 750;
  doc.fontSize(8).fillColor('#94a3b8').text('Este documento es de carácter informativo y no sustituye el certificado oficial de calificaciones.', { align: 'center' });

  doc.end();
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
};


export const generarConstanciaPDF = async (alumnoData, tipo = 'estudios', becaData = null) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const logo = getLogoBase64();

  
  
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .strokeColor('#1A6B35')
     .lineWidth(2)
     .stroke();
  
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
     .strokeColor('#1A6B35')
     .lineWidth(0.5)
     .stroke();

  
  if (logo) {
    try {
      doc.opacity(0.08); 
      doc.image(logo, (doc.page.width - 350) / 2, (doc.page.height - 350) / 2, { width: 350 });
      doc.opacity(1); 
    } catch {}
  }

  
  if (logo) {
    try { doc.image(logo, 50, 45, { width: 60 }); } catch {}
  }

  const titulos = {
    estudios: 'CONSTANCIA DE ESTUDIOS',
    conducta: 'CONSTANCIA DE BUENA CONDUCTA',
    beca: 'CONSTANCIA DE BECA',
    trabajo: 'CONSTANCIA DE TRABAJO',
    servicio_social: 'CONSTANCIA DE SERVICIO SOCIAL',
    practicas: 'CONSTANCIA DE PRÁCTICAS PROFESIONALES',
  };
  const titulo = titulos[tipo] || titulos.estudios;

  
  doc.y = 65; 
  doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(titulo, { align: 'center' });
  doc.moveDown(0.5);
  
  
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1A6B35').lineWidth(1.5).stroke();
  doc.moveDown(2);

  
  doc.fontSize(12).font('Helvetica').fillColor('#333333'); 
  const textosIntro = {
    estudios: 'La Dirección del CECyTE Plantel 1 hace constar que:',
    conducta: 'La Dirección del CECyTE Plantel 1 certifica la buena conducta de:',
    beca: 'La Dirección del CECyTE Plantel 1 expide la presente constancia de beca a:',
    trabajo: 'La Dirección del CECyTE Plantel 1 expide la presente constancia de trabajo a:',
    servicio_social: 'La Dirección del CECyTE Plantel 1 certifica que el siguiente alumno ha cumplido con el Servicio Social:',
    practicas: 'La Dirección del CECyTE Plantel 1 certifica que el siguiente alumno ha realizado Prácticas Profesionales:',
  };
  doc.text(textosIntro[tipo] || textosIntro.estudios, { align: 'center' });
  doc.moveDown(2);

  
  const startX = 120; 
  doc.fillColor('black'); 
  
  const campos = [
    ['Nombre del Alumno:', `${alumnoData.apellidos}, ${alumnoData.nombre}`],
    ['Número de Matrícula:', alumnoData.matricula],
    ['Semestre Actual:', `${alumnoData.semestre_actual}° Semestre`],
    ['Especialidad Técnica:', alumnoData.especialidad_nombre || 'Sin especialidad'],
    ['Grupo Asignado:', alumnoData.grupo_nombre || 'Sin grupo'],
  ];
  
  campos.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(label, startX, doc.y, { continued: true, width: 150 });
    doc.font('Helvetica').text(`  ${value}`, { continued: false });
    doc.moveDown(0.5); 
  });

  
  if (tipo === 'beca' && becaData) {
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Detalles de la beca:', startX, doc.y, { continued: true });
    doc.font('Helvetica').text(` ${becaData.nombre_beca}`);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Monto Asignado:', startX, doc.y, { continued: true });
    doc.font('Helvetica').text(` $${becaData.monto?.toFixed(2) || '0.00'} MXN`);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Estatus Actual:', startX, doc.y, { continued: true });
    doc.font('Helvetica').text(` ${becaData.estatus.toUpperCase()}`);
  }

  doc.moveDown(3);
  
  
  const textosFin = {
    estudios: 'Se expide la presente constancia para los fines legales e institucionales que al interesado convengan.',
    conducta: 'Se expide la presente constancia de buena conducta para los fines que el interesado estime convenientes.',
    beca: 'Se expide la presente constancia de beca para los fines que el interesado estime convenientes.',
    trabajo: 'Se expide la presente constancia de trabajo para los fines que el interesado estime convenientes.',
    servicio_social: 'Se expide la presente constancia de Servicio Social para los fines que el interesado estime convenientes.',
    practicas: 'Se expide la presente constancia de Prácticas Profesionales para los fines que el interesado estime convenientes.',
  };
  
  doc.x = 50; 
  doc.fontSize(11).fillColor('#333333').text(textosFin[tipo] || textosFin.estudios, { align: 'center', width: 495 });
  doc.moveDown(3);

  
  const signatureY = doc.y + 40;
  
  doc.moveTo(200, signatureY).lineTo(395, signatureY).strokeColor('black').lineWidth(1).stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('FIRMA Y SELLO DE LA DIRECCIÓN', 50, signatureY + 10, { align: 'center' });
  
  
  
  doc.y = 720;
  doc.fontSize(10).font('Helvetica').text(
    `Fecha de expedición: Macuspana, Tabasco a ${new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })}`, 
    { align: 'center' }
  );
  
  doc.y = 750;
  doc.fontSize(8).fillColor('#94a3b8').text('Este documento es un comprobante interno del CECyTE Plantel 1 y está sujeto a verificación en el sistema académico.', { align: 'center' });

  doc.end();
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
};