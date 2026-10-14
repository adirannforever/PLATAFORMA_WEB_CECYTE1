import { query } from '../config/db.js';

/**
 * ============================================================
 * ADMIN DASHBOARD — aggregated, read-only snapshot.
 * ------------------------------------------------------------
 * GET /api/dashboard/admin  (verifyToken + requireRole('administrador'))
 *
 * Returns a single, stable JSON payload for the admin "Inicio"
 * dashboard so the UI needs only ONE request and cannot show
 * fabricated data. Every number/series is computed from real SQL
 * aggregations. Empty tables degrade to zeros / empty arrays,
 * never errors. All queries are parameterized; these are read-only
 * aggregate scans with no user-interpolated input.
 *
 * RESPONSE SHAPE (data):
 * {
 *   generado_en: ISOString,
 *   ciclo: { id, nombre, fecha_inicio, fecha_fin } | null,
 *   kpis: {
 *     alumnos:{valor,delta_mes}, docentes:{valor,delta_mes},
 *     materias:{valor}, grupos:{valor}, comunicados:{valor},
 *     aspirantes_pendientes:{valor,delta_mes}, incidencias_abiertas:{valor},
 *     asistencia_semana:{valor:number|null,presentes,total},
 *     promedio_general: number|null
 *   },
 *   alertas: [ { id, titulo, descripcion, cantidad, ruta, severidad } ],
 *   graficas: {
 *     alumnos_por_semestre:[{etiqueta,valor}],
 *     alumnos_por_especialidad:[{etiqueta,valor}],
 *     asistencia_semanal:[{semana,presentes,ausentes}],
 *     calificaciones_parcial:[{parcial,promedio,aprobados,reprobados}]
 *   },
 *   comunicados_recientes:[{id,titulo,contenido,archivos,autor,fecha_publicacion,dirigido_a_rol}],
 *   actividad_reciente:[{tipo,titulo,descripcion,fecha}]
 * }
 * ============================================================
 */

const num = (v) => (v === null || v === undefined ? 0 : Number(v));

// Runs an independent query; a failing sub-query never breaks the
// whole snapshot, it resolves to `fallback`.
const segura = (promise, fallback) =>
  Promise.resolve(promise).catch((err) => {
    console.error('[dashboard.admin] subquery fallback:', err.message);
    return fallback;
  });

export const getAdminDashboard = async (req, res) => {
  try {
    // ---- Ciclo activo (contexto del dashboard) --------------------
    const cicloRes = await segura(
      query(
        `SELECT id, nombre, fecha_inicio, fecha_fin
           FROM ciclos_escolares WHERE activo = TRUE LIMIT 1`
      ),
      { rows: [] }
    );
    const ciclo = cicloRes.rows[0] || null;
    const cicloId = ciclo?.id ?? null;

    // ---- KPIs principales + deltas -------------------------------
    const conteosRes = await segura(
      query(
        `SELECT
           (SELECT COUNT(*) FROM usuarios    WHERE rol='alumno'     AND activo=TRUE) AS alumnos,
           (SELECT COUNT(*) FROM usuarios    WHERE rol='docente'    AND activo=TRUE) AS docentes,
           (SELECT COUNT(*) FROM materias_catalogo)                                      AS materias,
           (SELECT COUNT(*) FROM grupos      WHERE activo=TRUE)                          AS grupos,
           (SELECT COUNT(*) FROM comunicados WHERE activo=TRUE)                          AS comunicados,
           (SELECT COUNT(*) FROM aspirantes  WHERE estatus NOT IN ('inscrito','rechazado')) AS aspirantes_pendientes,
           (SELECT COUNT(*) FROM incidencias WHERE resuelta=FALSE)                       AS incidencias_abiertas`
      ),
      { rows: [{}] }
    );
    const c = conteosRes.rows[0] || {};

    const deltaRes = await segura(
      query(
        `SELECT
           (SELECT COUNT(*) FROM usuarios   WHERE rol='alumno'  AND fecha_registro > NOW() - INTERVAL '30 days') AS alumnos_mes,
           (SELECT COUNT(*) FROM usuarios   WHERE rol='docente' AND fecha_registro > NOW() - INTERVAL '30 days') AS docentes_mes,
           (SELECT COUNT(*) FROM aspirantes WHERE fecha_registro > NOW() - INTERVAL '30 days')                  AS aspirantes_mes`
      ),
      { rows: [{}] }
    );
    const d = deltaRes.rows[0] || {};

    // Asistencia de la última semana (asistencia_clase).
    const asistRes = await segura(
      query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado IN ('presente','tardanza','justificado')) AS presentes
           FROM asistencia_clase
          WHERE fecha > CURRENT_DATE - INTERVAL '7 days'`
      ),
      { rows: [{ total: 0, presentes: 0 }] }
    );
    const asist = asistRes.rows[0] || {};
    const asistTotal = num(asist.total);
    const asistPresentes = num(asist.presentes);

    // Promedio general de calificaciones (ciclo activo si existe).
    const promRes = await segura(
      query(
        cicloId
          ? `SELECT ROUND(AVG(calificacion)::numeric, 2) AS promedio
               FROM calificaciones WHERE ciclo_id = $1`
          : `SELECT ROUND(AVG(calificacion)::numeric, 2) AS promedio FROM calificaciones`,
        cicloId ? [cicloId] : []
      ),
      { rows: [{ promedio: null }] }
    );
    const promGeneral = promRes.rows[0]?.promedio ?? null;

    // ---- Graficas (alumnos por semestre 1..6) ---------------------
    const semRes = await segura(
      query(
        `SELECT COALESCE(a.semestre_actual, 0) AS semestre, COUNT(*) AS valor
           FROM alumnos a
           JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.estatus='activo' AND u.activo=TRUE
          GROUP BY COALESCE(a.semestre_actual, 0)`
      ),
      { rows: [] }
    );
    const semMap = new Map(semRes.rows.map((r) => [Number(r.semestre), num(r.valor)]));
    const alumnosPorSemestre = [1, 2, 3, 4, 5, 6].map((s) => ({
      etiqueta: `${s}°`,
      valor: semMap.get(s) ?? 0,
    }));

    const espRes = await segura(
      query(
        `SELECT e.nombre AS etiqueta, COUNT(*) AS valor
           FROM alumnos a
           JOIN usuarios u ON u.id = a.usuario_id
           JOIN especialidades e ON e.id = a.especialidad_id
          WHERE a.estatus='activo' AND u.activo=TRUE
          GROUP BY e.nombre
          ORDER BY valor DESC`
      ),
      { rows: [] }
    );

    const asistSemRes = await segura(
      query(
        `SELECT DATE_TRUNC('week', fecha)::date AS semana,
                COUNT(*) FILTER (WHERE estado IN ('presente','tardanza','justificado')) AS presentes,
                COUNT(*) FILTER (WHERE estado = 'ausente') AS ausentes
           FROM asistencia_clase
          WHERE fecha > CURRENT_DATE - INTERVAL '56 days'
          GROUP BY semana
          ORDER BY semana`
      ),
      { rows: [] }
    );

    const califRes = await segura(
      query(
        cicloId
          ? `SELECT parcial, ROUND(AVG(calificacion)::numeric,2) AS promedio,
                    COUNT(*) FILTER (WHERE calificacion >= 6) AS aprobados,
                    COUNT(*) FILTER (WHERE calificacion <  6) AS reprobados
               FROM calificaciones WHERE ciclo_id = $1
              GROUP BY parcial ORDER BY parcial`
          : `SELECT parcial, ROUND(AVG(calificacion)::numeric,2) AS promedio,
                    COUNT(*) FILTER (WHERE calificacion >= 6) AS aprobados,
                    COUNT(*) FILTER (WHERE calificacion <  6) AS reprobados
               FROM calificaciones
              GROUP BY parcial ORDER BY parcial`,
        cicloId ? [cicloId] : []
      ),
      { rows: [] }
    );

    // ---- Alertas accionables (conteos reales) --------------------
    const alertasRaw = await Promise.all([
      segura(query(`SELECT COUNT(*) FROM aspirantes WHERE estatus NOT IN ('inscrito','rechazado')`), { rows: [{ count: 0 }] }),
      segura(
        query(
          `SELECT COUNT(*) FROM materias_grupo mg
             JOIN ciclos_escolares ci ON ci.id = mg.ciclo_id
            WHERE ci.activo = TRUE AND mg.activa = TRUE AND mg.docente_id IS NULL`
        ),
        { rows: [{ count: 0 }] }
      ),
      segura(
        query(
          `SELECT COUNT(*) FROM materias_grupo mg
             JOIN ciclos_escolares ci ON ci.id = mg.ciclo_id
            WHERE ci.activo = TRUE AND mg.activa = TRUE
              AND NOT EXISTS (SELECT 1 FROM horarios h WHERE h.materia_grupo_id = mg.id)`
        ),
        { rows: [{ count: 0 }] }
      ),
      segura(query(`SELECT COUNT(*) FROM incidencias WHERE resuelta = FALSE`), { rows: [{ count: 0 }] }),
      segura(
        query(
          cicloId
            ? `SELECT COUNT(*) FROM (
                 SELECT c.alumno_id FROM calificaciones c
                  WHERE c.ciclo_id = $1
                  GROUP BY c.alumno_id
                 HAVING AVG(c.calificacion) < 6
               ) t`
            : `SELECT 0 AS count`,
          cicloId ? [cicloId] : []
        ),
        { rows: [{ count: 0 }] }
      ),
      segura(
        query(`SELECT COUNT(*) FROM alumnos a WHERE a.estatus='activo' AND a.grupo_actual_id IS NULL`),
        { rows: [{ count: 0 }] }
      ),
    ]);

    const alertaDefs = [
      { id: 'aspirantes_pendientes', titulo: 'Aspirantes por revisar', descripcion: 'Solicitudes en proceso sin resolución (documentos, ficha o examen).', ruta: '/aspirantes', severidad: 'warning', cantidad: num(alertasRaw[0].rows[0]?.count) },
      { id: 'materias_sin_docente', titulo: 'Materias sin docente', descripcion: 'Grupos-materia del ciclo activo sin profesor asignado.', ruta: '/grupos', severidad: 'warning', cantidad: num(alertasRaw[1].rows[0]?.count) },
      { id: 'materias_sin_horario', titulo: 'Materias sin horario', descripcion: 'Grupos-materia del ciclo activo sin ningún bloque de horario.', ruta: '/horarios', severidad: 'info', cantidad: num(alertasRaw[2].rows[0]?.count) },
      { id: 'incidencias_abiertas', titulo: 'Incidencias abiertas', descripcion: 'Incidencias registradas que aún no se marcan como resueltas.', ruta: '/incidencias', severidad: 'danger', cantidad: num(alertasRaw[3].rows[0]?.count) },
      { id: 'alumnos_en_riesgo', titulo: 'Alumnos en riesgo académico', descripcion: 'Alumnos con promedio por debajo de 6 en el ciclo activo.', ruta: '/calificaciones', severidad: 'danger', cantidad: num(alertasRaw[4].rows[0]?.count) },
      { id: 'alumnos_sin_grupo', titulo: 'Alumnos sin grupo', descripcion: 'Alumnos activos sin un grupo actual asignado.', ruta: '/inscripciones', severidad: 'warning', cantidad: num(alertasRaw[5].rows[0]?.count) },
    ];
    const severidadPeso = { danger: 0, warning: 1, info: 2 };
    const alertas = alertaDefs.slice().sort(
      (a, b) => b.cantidad - a.cantidad || severidadPeso[a.severidad] - severidadPeso[b.severidad]
    );

    // ---- Comunicados recientes -----------------------------------
    const comRes = await segura(
      query(
        `SELECT c.id, c.titulo, c.contenido, c.archivos, c.fecha_publicacion, c.dirigido_a_rol,
                (u.nombre || ' ' || u.apellidos) AS autor
           FROM comunicados c
           JOIN usuarios u ON u.id = c.autor_id
          WHERE c.activo = TRUE
          ORDER BY c.fecha_publicacion DESC
          LIMIT 4`
      ),
      { rows: [] }
    );

    // ---- Actividad reciente (UNION, LIMIT 8) ---------------------
    const actRes = await segura(
      query(
        `SELECT * FROM (
           SELECT 'calificacion' AS tipo,
                  ('Calificacion — ' || COALESCE(g.nombre,'') || ' · Parcial ' || c.parcial::text) AS titulo,
                  ('Calif. ' || c.calificacion::text) AS descripcion,
                  c.fecha_registro AS fecha
             FROM calificaciones c
             LEFT JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
             LEFT JOIN grupos g ON g.id = mg.grupo_id
           UNION ALL
           SELECT 'incidencia', ('Incidencia: ' || i.tipo),
                  LEFT(i.descripcion, 120), (i.fecha::timestamptz)
             FROM incidencias i
           UNION ALL
           SELECT 'aspirante', 'Nuevo aspirante',
                  (a.nombre || ' ' || a.apellidos), a.fecha_registro
             FROM aspirantes a
           UNION ALL
           SELECT 'comunicado', 'Comunicado publicado',
                  c2.titulo, c2.fecha_publicacion
             FROM comunicados c2
         ) t
         ORDER BY fecha DESC
         LIMIT 8`
      ),
      { rows: [] }
    );

    return res.json({
      success: true,
      data: {
        generado_en: new Date().toISOString(),
        ciclo,
        kpis: {
          alumnos: { valor: num(c.alumnos), delta_mes: num(d.alumnos_mes) },
          docentes: { valor: num(c.docentes), delta_mes: num(d.docentes_mes) },
          materias: { valor: num(c.materias) },
          grupos: { valor: num(c.grupos) },
          comunicados: { valor: num(c.comunicados) },
          aspirantes_pendientes: { valor: num(c.aspirantes_pendientes), delta_mes: num(d.aspirantes_mes) },
          incidencias_abiertas: { valor: num(c.incidencias_abiertas) },
          asistencia_semana: {
            valor: asistTotal > 0 ? Math.round((asistPresentes / asistTotal) * 1000) / 10 : null,
            presentes: asistPresentes,
            total: asistTotal,
          },
          promedio_general: promGeneral === null ? null : Number(promGeneral),
        },
        alertas,
        graficas: {
          alumnos_por_semestre: alumnosPorSemestre,
          alumnos_por_especialidad: espRes.rows.map((r) => ({ etiqueta: r.etiqueta, valor: num(r.valor) })),
          asistencia_semanal: asistSemRes.rows.map((r) => ({ semana: r.semana, presentes: num(r.presentes), ausentes: num(r.ausentes) })),
          calificaciones_parcial: califRes.rows.map((r) => ({ parcial: num(r.parcial), promedio: r.promedio === null ? null : Number(r.promedio), aprobados: num(r.aprobados), reprobados: num(r.reprobados) })),
        },
        comunicados_recientes: comRes.rows,
        actividad_reciente: actRes.rows,
      },
    });
  } catch (err) {
    console.error('Error en getAdminDashboard:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Error al generar el panel administrativo.' });
  }
};
