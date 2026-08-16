import {
  generarBoletaPDFService,
  generarConstanciaPDFService,
  generarListadoAlumnosExcelService,
  generarEstadisticasExcelService,
  generarExcelAsistenciasClaseService,
} from '../services/reportes.service.js';
import { query } from '../config/db.js';

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
// GENERAR BOLETA (PDF) - CON FILTROS DE PARCIALES Y PERÍODO
// ============================================================
export const generarBoleta = async (req, res) => {
  try {
    const { alumno_id, ciclo_id, parciales, periodo } = req.query;
    let alumnoIdFinal;

    // Si es alumno, obtener su ID desde la tabla alumnos
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
      // Admin o docente: usar el alumno_id del query
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

    // ===== CONSTRUIR FILTROS =====
    const filtros = {};

    // Procesar parciales (vienen como "1,2,3" o "1" o "2,3")
    if (parciales) {
      filtros.parciales = parciales.split(',').map(Number).filter(p => [1, 2, 3].includes(p));
    } else {
      filtros.parciales = [1, 2, 3]; // Por defecto todos
    }

    if (periodo) {
      filtros.periodo = periodo;
    }

    // ===== GENERAR PDF =====
    const pdfBuffer = await generarBoletaPDFService(
      alumnoIdFinal,
      parseInt(ciclo_id),
      filtros
    );

    // Obtener nombre del alumno para el nombre del archivo
    const alumnoRes = await query(
      'SELECT u.nombre, u.apellidos FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = $1',
      [alumnoIdFinal]
    );
    const nombreArchivo = alumnoRes.rows[0]
      ? `boleta_${alumnoRes.rows[0].apellidos}_${alumnoRes.rows[0].nombre}.pdf`
      : `boleta_${alumnoIdFinal}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando boleta:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GENERAR CONSTANCIA (PDF) - CON TIPO DE CONSTANCIA
// ============================================================
export const generarConstancia = async (req, res) => {
  try {
    const { alumno_id, tipo_constancia } = req.query;
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
      if (!alumno_id) {
        return res.status(400).json({ success: false, message: 'Se requiere alumno_id' });
      }
      alumnoIdFinal = parseInt(alumno_id);
      const { permitido, mensaje } = await verificarPermisosAlumno(req, alumnoIdFinal);
      if (!permitido) {
        return res.status(403).json({ success: false, message: mensaje });
      }
    }

    // ===== TIPO DE CONSTANCIA =====
    const tipo = tipo_constancia || 'estudios';

    // ===== GENERAR PDF =====
    const pdfBuffer = await generarConstanciaPDFService(alumnoIdFinal, tipo);

    // Obtener nombre del alumno para el nombre del archivo
    const alumnoRes = await query(
      'SELECT u.nombre, u.apellidos FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = $1',
      [alumnoIdFinal]
    );
    const nombreArchivo = alumnoRes.rows[0]
      ? `constancia_${alumnoRes.rows[0].apellidos}_${alumnoRes.rows[0].nombre}.pdf`
      : `constancia_${alumnoIdFinal}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
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

    // Si es docente, filtrar solo sus grupos
    if (req.user.rol === 'docente') {
      const gruposRes = await query(
        'SELECT DISTINCT grupo_id FROM materias_grupo WHERE docente_id = $1 AND activa = TRUE',
        [req.user.id]
      );
      const ids = gruposRes.rows.map(r => r.grupo_id);
      if (ids.length > 0) {
        filtros.grupo_ids = ids;
      } else {
        // Si no tiene grupos, devolver Excel vacío
        const emptyBuffer = await generarListadoAlumnosExcelService({ ...filtros, grupo_ids: [-1] });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=listado_alumnos_vacio.xlsx');
        return res.send(emptyBuffer);
      }
    }

    // Generar Excel
    const excelBuffer = await generarListadoAlumnosExcelService(filtros);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename=listado_alumnos_${timestamp}.xlsx`);
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

    const excelBuffer = await generarEstadisticasExcelService(
      parseInt(ciclo_id),
      grupo_id ? parseInt(grupo_id) : null
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename=estadisticas_${timestamp}.xlsx`);
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

    // Alumnos no pueden exportar asistencias
    if (req.user.rol === 'alumno') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    // Si es docente, verificar que la materia le pertenezca
    if (req.user.rol === 'docente') {
      const checkRes = await query(
        'SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE',
        [parseInt(materia_grupo_id), req.user.id]
      );
      if (checkRes.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta materia' });
      }
    }

    const buffer = await generarExcelAsistenciasClaseService(
      parseInt(materia_grupo_id),
      fecha
    );

    const filename = `asistencias_materia_${materia_grupo_id}_${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exportando asistencias a Excel:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};