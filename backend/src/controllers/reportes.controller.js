import {
  generarBoletaPDF,
  generarConstanciaPDF,
  generarListadoAlumnosExcel,
  generarEstadisticasExcel,
  generarExcelAsistenciasClase as generarExcelAsistenciasClaseService,
} from '../services/reportes.service.js';
import { query } from '../config/db.js';

// ============================================================
// VERIFICAR PERMISOS DE ALUMNO
// ============================================================
async function verificarPermisosAlumno(req, alumno_id) {
  const userId = req.user.id;
  const userRole = req.user.rol;

  if (userRole === 'administrador') {
    return { permitido: true, mensaje: null };
  }

  if (userRole === 'alumno') {
    const alumnoRes = await query(
      'SELECT usuario_id FROM alumnos WHERE id = $1',
      [alumno_id]
    );
    if (!alumnoRes.rows[0] || alumnoRes.rows[0].usuario_id !== userId) {
      return { permitido: false, mensaje: 'No puedes generar reportes de otro alumno' };
    }
    return { permitido: true, mensaje: null };
  }

  if (userRole === 'docente') {
    const docenteRes = await query(
      `SELECT COUNT(*) as total
       FROM materias_grupo mg
       JOIN alumnos a ON a.grupo_actual_id = mg.grupo_id
       WHERE mg.docente_id = $1 AND a.id = $2 AND mg.activa = TRUE`,
      [userId, alumno_id]
    );
    if (parseInt(docenteRes.rows[0].total) === 0) {
      return { permitido: false, mensaje: 'No puedes generar reportes de alumnos que no están en tus grupos' };
    }
    return { permitido: true, mensaje: null };
  }

  return { permitido: false, mensaje: 'Rol no autorizado' };
}

// ============================================================
// GENERAR BOLETA (PDF)
// ============================================================
export const generarBoleta = async (req, res) => {
  try {
    const { alumno_id, ciclo_id } = req.query;
    let alumnoIdFinal;

    if (req.user.rol === 'alumno') {
      const result = await query(
        'SELECT id FROM alumnos WHERE usuario_id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
      }
      alumnoIdFinal = result.rows[0].id;
    } else {
      if (!alumno_id || !ciclo_id) {
        return res.status(400).json({ success: false, message: 'Se requiere alumno_id y ciclo_id' });
      }
      alumnoIdFinal = parseInt(alumno_id);
      const { permitido, mensaje } = await verificarPermisosAlumno(req, alumnoIdFinal);
      if (!permitido) {
        return res.status(403).json({ success: false, message: mensaje });
      }
    }

    if (!ciclo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere ciclo_id' });
    }

    const pdfBuffer = await generarBoletaPDF(alumnoIdFinal, parseInt(ciclo_id));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=boleta_${alumnoIdFinal}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando boleta:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GENERAR CONSTANCIA (PDF)
// ============================================================
export const generarConstancia = async (req, res) => {
  try {
    let alumnoIdFinal;
    if (req.user.rol === 'alumno') {
      const result = await query(
        'SELECT id FROM alumnos WHERE usuario_id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
      }
      alumnoIdFinal = result.rows[0].id;
    } else {
      const { alumno_id } = req.query;
      if (!alumno_id) {
        return res.status(400).json({ success: false, message: 'Se requiere alumno_id' });
      }
      alumnoIdFinal = parseInt(alumno_id);
      const { permitido, mensaje } = await verificarPermisosAlumno(req, alumnoIdFinal);
      if (!permitido) {
        return res.status(403).json({ success: false, message: mensaje });
      }
    }

    const pdfBuffer = await generarConstanciaPDF(alumnoIdFinal);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=constancia_${alumnoIdFinal}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando constancia:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GENERAR LISTADO DE ALUMNOS (EXCEL)
// ============================================================
export const generarListadoAlumnos = async (req, res) => {
  try {
    if (req.user.rol === 'alumno') {
      return res.status(403).json({ success: false, message: 'Los alumnos no pueden generar listados' });
    }

    const filtros = req.query;

    if (req.user.rol === 'docente') {
      const gruposRes = await query(
        'SELECT DISTINCT grupo_id FROM materias_grupo WHERE docente_id = $1 AND activa = TRUE',
        [req.user.id]
      );
      const ids = gruposRes.rows.map(r => r.grupo_id);
      if (ids.length > 0) {
        filtros.grupo_ids = ids;
      } else {
        const emptyBuffer = await generarListadoAlumnosExcel({ ...filtros, grupo_ids: [-1] });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=listado_alumnos.xlsx');
        return res.send(emptyBuffer);
      }
    }

    const excelBuffer = await generarListadoAlumnosExcel(filtros);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=listado_alumnos.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error generando listado:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GENERAR ESTADÍSTICAS (EXCEL)
// ============================================================
export const generarEstadisticas = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden generar estadísticas' });
    }

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

// ============================================================
// EXPORTAR ASISTENCIAS A EXCEL
// ============================================================
export const generarExcelAsistenciasClase = async (req, res) => {
  try {
    const { materia_grupo_id, fecha } = req.query;
    if (!materia_grupo_id || !fecha) {
      return res.status(400).json({ success: false, message: 'Se requiere materia_grupo_id y fecha' });
    }

    if (req.user.rol === 'alumno') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const buffer = await generarExcelAsistenciasClaseService(parseInt(materia_grupo_id), fecha);

    const filename = `asistencias_${materia_grupo_id}_${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exportando asistencias a Excel:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};