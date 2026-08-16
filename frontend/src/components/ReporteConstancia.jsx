import { useState } from 'react';
import { reportesService } from '../services/api';
import { downloadPDF } from '../utils/downloadHelper';

export default function ReporteConstancia({ alumnoId, alumnoNombre }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerar = async () => {
    if (!alumnoId) {
      setError('Debes proporcionar el ID del alumno.');
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const blob = await reportesService.generarConstancia({ alumno_id: alumnoId });
      const nombre = alumnoNombre ? `constancia_${alumnoNombre}` : `constancia_${alumnoId}`;
      downloadPDF(blob, nombre);
    } catch (err) {
      console.error('Error al generar constancia:', err);
      setError('No se pudo generar la constancia. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="reporte-constancia">
      <button
        onClick={handleGenerar}
        disabled={cargando || !alumnoId}
        className="btn btn-success"
      >
        {cargando ? 'Generando...' : ' Descargar Constancia (PDF)'}
      </button>
      {error && <p className="text-danger" style={{ color: '#b91c1c', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}