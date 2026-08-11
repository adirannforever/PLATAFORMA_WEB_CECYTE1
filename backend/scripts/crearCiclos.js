import { crearCiclosFuturos, verificarCicloActivo } from '../utils/ciclos.js';
import '../config/db.js';

const main = async () => {
  console.log(' Creando ciclos escolares...');
  await crearCiclosFuturos();
  await verificarCicloActivo();
  console.log(' Ciclos verificados y creados.');
  process.exit(0);
};

main();