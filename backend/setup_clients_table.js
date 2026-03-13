import pool from './src/config/database.js';

async function setup() {
  try {
    console.log('Creando tabla clients...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        model VARCHAR(100),
        message TEXT,
        status ENUM('new', 'read') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla clients creada correctamente.');
  } catch (error) {
    console.error('Error creando la tabla:', error);
  } finally {
    process.exit(0);
  }
}

setup();
