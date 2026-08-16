import { useState } from 'react';
import { reportesService } from '../services/api';
import { downloadPDF } from '../utils/downloadHelper'; 

export default function ReporteBoleta({ alumnoId, alumnoNombre }) {
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
      const blob = await reportesService.generarBoleta({ alumno_id: alumnoId });
      const nombre = alumnoNombre ? `boleta_${alumnoNombre}` : `boleta_${alumnoId}`;
      downloadPDF(blob, nombre);
    } catch (err) {
      console.error('Error al generar boleta:', err);
      setError('No se pudo generar la boleta. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="reporte-boleta">
      <button
        onClick={handleGenerar}
        disabled={cargando || !alumnoId}
        className="btn btn-primary"
      >
        {cargando ? 'Generando...' : ' Descargar Boleta (PDF)'}
      </button>
      {error && <p className="text-danger" style={{ color: '#b91c1c', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}