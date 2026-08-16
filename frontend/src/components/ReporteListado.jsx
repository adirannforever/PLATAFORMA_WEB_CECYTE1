import { useState } from 'react';
import { reportesService } from '../services/api';
import { downloadExcel } from '../utils/downloadHelper';

export default function ReporteListado({ grupoId, cicloId }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerar = async () => {
    if (!grupoId) {
      setError('Debes proporcionar el ID del grupo.');
      return;
    }

    const params = { grupo_id: grupoId };
    if (cicloId) params.ciclo_id = cicloId;

    setCargando(true);
    setError(null);
    try {
      const blob = await reportesService.generarListadoAlumnos(params);
      downloadExcel(blob, `listado_alumnos_grupo_${grupoId}`);
    } catch (err) {
      console.error('Error al generar listado:', err);
      setError('No se pudo generar el listado. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="reporte-listado">
      <button
        onClick={handleGenerar}
        disabled={cargando || !grupoId}
        className="btn btn-info"
      >
        {cargando ? 'Generando...' : ' Descargar Listado (Excel)'}
      </button>
      {error && <p className="text-danger" style={{ color: '#b91c1c', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}