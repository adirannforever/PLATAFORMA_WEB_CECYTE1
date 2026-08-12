
import cron from 'node-cron';
import { backup } from './backup.js';

console.log(" El planificador de respaldos está encendido y esperando...");
console.log(" Se ejecutará todos los días a las 3:00 AM (HORA DE MÉXICO).");


cron.schedule('0 3 * * *', async () => {
  console.log(" Son las 3:00 AM. Iniciando el trabajo para la base de datos...");

  try {
    await backup();
    console.log(" Trabajo nocturno terminado.");
  } catch (error) {
    console.error(" Error en el backup nocturno:", error);
  }
}, {
  scheduled: true,
  timezone: "America/Mexico_City" 
});

console.log(" Scheduler registrado. El sistema hará backups automáticos.");