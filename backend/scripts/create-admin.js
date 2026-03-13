import pool from '../src/config/database.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
    try {
        const email = 'admin@tayga.com';
        const rawPassword = 'admin'; // Contraseña por defecto

        // Check if exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('✅ El usuario administrador ya existe.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        await pool.query(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [email, hashedPassword]
        );
        console.log(`✅ Administrador creado con éxito.\nEmail: ${email}\nContraseña: ${rawPassword}\n\nPuedes entrar al panel con estas credenciales y cambiar la contraseña después.`);
    } catch (e) {
        console.error('Error creating admin:', e);
    } finally {
        process.exit(0);
    }
}
createAdmin();
