/**
 * Descarga un archivo desde un blob
 * @param {Blob} blob - El blob del archivo
 * @param {string} filename - Nombre del archivo con extensión para identificacion por si algun dia el sistema lo expando
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Descarga un archivo Excel (.xlsx)
 * @param {Blob} blob - El blob del archivo
 * @param {string} nombreBase - Nombre base del archivo (sin extensión) se piensa que en el archivo se ponga la fecha para que sea mas facil de buscar despues.
 */
export const downloadExcel = (blob, nombreBase = 'reporte') => {
  const fecha = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `${nombreBase}_${fecha}.xlsx`);
};

/**
 * Descarga un archivo PDF
 * @param {Blob} blob - El blob del archivo
 * @param {string} nombreBase - Nombre base del archivo mas lo mismo del nombre del excel
 */
export const downloadPDF = (blob, nombreBase = 'reporte') => {
  const fecha = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `${nombreBase}_${fecha}.pdf`);
};