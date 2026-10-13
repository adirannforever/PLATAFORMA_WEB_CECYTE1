import { FileText } from 'lucide-react';
import styles from './ComunicadoAttachments.module.css';

export default function ComunicadoAttachments({ comunicadoId, archivos = [], publico = false }) {
  if (!Array.isArray(archivos) || !archivos.length) return null;

  return (
    <div className={styles.attachments} aria-label="Archivos adjuntos">
      {archivos.map((archivo, index) => {
        const route = publico ? 'public/avisos' : 'comunicados';
        const url = `/api/${route}/${comunicadoId}/archivos/${index}`;
        if (archivo.tipo?.startsWith('image/')) {
          return (
            <a
              key={archivo.key || `${archivo.nombre}-${index}`}
              className={styles.imageLink}
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir imagen adjunta: ${archivo.nombre}`}
            >
              <img className={styles.image} src={url} alt={archivo.nombre} loading="lazy" />
            </a>
          );
        }

        return (
          <a
            key={archivo.key || `${archivo.nombre}-${index}`}
            className={styles.document}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={18} aria-hidden="true" />
            <span>{archivo.nombre}</span>
          </a>
        );
      })}
    </div>
  );
}
