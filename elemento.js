import bcrypt from 'bcrypt';

async function crearHashPassword() {
    const passwordPlana = '123456'; // La contraseña que deseas encriptar
    const saltRounds = 10;

    const hash = await bcrypt.hash(passwordPlana, saltRounds);
    console.log('Contraseña plana:', passwordPlana);
    console.log('Hash generado:', hash);
}

crearHashPassword();