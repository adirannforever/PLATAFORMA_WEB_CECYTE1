import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let logoBase64 = null;

export const getLogoBase64 = () => {
  if (logoBase64) return logoBase64;

  try {
    const logoPath = path.join(__dirname, '../assets/logo_cecyte.png');
    const imageBuffer = fs.readFileSync(logoPath);

    logoBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    return logoBase64;
  } catch (error) {
    console.error('Error cargando el logo:', error);
    return null;
  }
};