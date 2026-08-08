import { query } from '../config/db.js';

export const getHorarioGrupo = async (req, res) => {
  const { grupo_id, ciclo_id } = req.query;
  try {
    const result = await query(
      `SELECT h.*, mc.nombre AS materia, pd.numero AS periodo_numero, pd.hora_inicio, pd.hora_fin,
              pd.turno_id, a.nombre AS aula_nombre, a.edificio_id, e.nombre AS edificio_nombre
       FROM horarios h
       JOIN materias_grupo mg ON h.materia_grupo_id = mg.id
       JOIN materias_catalogo mc ON mg.materia_catalogo_id = mc.id
       JOIN periodos_dia pd ON h.periodo_id = pd.id
       LEFT JOIN aulas a ON h.aula_id = a.id
       LEFT JOIN edificios e ON a.edificio_id = e.id
       WHERE mg.grupo_id = $1 AND h.ciclo_id = $2
       ORDER BY h.dia_semana, pd.numero`,
      [grupo_id, ciclo_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getHorarioGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Asignar un nuevo horario (POST)
export const asignarHorario = async (req, res) => {
  const { materia_grupo_id, aula_id, dia_semana, periodo_id, ciclo_id } = req.body;

  if (!materia_grupo_id || !dia_semana || !periodo_id || !ciclo_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Faltan campos obligatorios para programar el horario.' 
    });
  }

  try {
    const result = await query(
      `INSERT INTO horarios (materia_grupo_id, aula_id, dia_semana, periodo_id, ciclo_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [materia_grupo_id, aula_id || null, dia_semana, periodo_id, ciclo_id]
    );

    return res.status(201).json({ 
      success: true, 
      message: 'Horario asignado con éxito.', 
      data: result.rows[0] 
    });
  } catch (err) {
    // Manejo de error 409 para constraint UNIQUE (23505) o excepción de trigger (P0001 / Conflicto de horario)
    if (err.code === '23505' || err.code === 'P0001' || err.message.includes('Conflicto de horario')) {
      return res.status(409).json({
        success: false,
        message: err.message.includes('Conflicto de horario')
          ? err.message
          : 'El aula o el grupo ya tienen una clase asignada en ese día y periodo.'
      });
    }
    console.error('Error en asignarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Actualizar un horario existente (PATCH)
export const actualizarHorario = async (req, res) => {
  const { id } = req.params;
  const { materia_grupo_id, aula_id, dia_semana, periodo_id, ciclo_id } = req.body;

  try {
    const result = await query(
      `UPDATE horarios
       SET materia_grupo_id = COALESCE($1, materia_grupo_id),
           aula_id          = COALESCE($2, aula_id),
           dia_semana       = COALESCE($3, dia_semana),
           periodo_id       = COALESCE($4, periodo_id),
           ciclo_id         = COALESCE($5, ciclo_id)
       WHERE id = $6
       RETURNING *`,
      [materia_grupo_id, aula_id || null, dia_semana, periodo_id, ciclo_id, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado.' });
    }

    return res.json({ 
      success: true, 
      message: 'Horario actualizado con éxito.', 
      data: result.rows[0] 
    });
  } catch (err) {
    if (err.code === '23505' || err.code === 'P0001' || err.message.includes('Conflicto de horario')) {
      return res.status(409).json({
        success: false,
        message: err.message.includes('Conflicto de horario')
          ? err.message
          : 'El aula o el grupo ya tienen una clase asignada en ese día y periodo.'
      });
    }
    console.error('Error en actualizarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Eliminar un horario (DELETE)
export const eliminarHorario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM horarios WHERE id = $1 RETURNING id',
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado.' });
    }

    return res.json({ success: true, message: 'Horario eliminado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};