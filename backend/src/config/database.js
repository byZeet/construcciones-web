import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Crear el pool de conexiones a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'construcciones_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar la conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión exitosa a la base de datos MySQL (construcciones_db)');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 CONSEJO: Revisa que DB_PASSWORD en tu backend/.env sea correcto.');
    }
  });

export default pool;
