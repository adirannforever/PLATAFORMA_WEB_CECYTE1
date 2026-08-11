import {
  generarBoletaPDF,
  generarConstanciaPDF,
  generarListadoAlumnosExcel,
  generarEstadisticasExcel,
} from '../services/reportes.service.js';

export const generarBoleta = async (req, res) => {
  try {
    const { alumno_id, ciclo_id } = req.query;
    if (!alumno_id || !ciclo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere alumno_id y ciclo_id' });
    }

    const pdfBuffer = await generarBoletaPDF(parseInt(alumno_id), parseInt(ciclo_id));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=boleta_${alumno_id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando boleta:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generarConstancia = async (req, res) => {
  try {
    const { alumno_id } = req.query;
    if (!alumno_id) {
      return res.status(400).json({ success: false, message: 'Se requiere alumno_id' });
    }

    const pdfBuffer = await generarConstanciaPDF(parseInt(alumno_id));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=constancia_${alumno_id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando constancia:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generarListadoAlumnos = async (req, res) => {
  try {
    const filtros = req.query;
    const excelBuffer = await generarListadoAlumnosExcel(filtros);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=listado_alumnos.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error generando listado:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generarEstadisticas = async (req, res) => {
  try {
    const { ciclo_id, grupo_id } = req.query;
    if (!ciclo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere ciclo_id' });
    }

    const excelBuffer = await generarEstadisticasExcel(parseInt(ciclo_id), grupo_id ? parseInt(grupo_id) : null);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=estadisticas.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error generando estadísticas:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};