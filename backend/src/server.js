import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-it-later';
const PORT = process.env.PORT || 3001;

// Configurar multer para subida de archivos al frontend (Astro)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASTRO_PUBLIC_DIR = path.resolve(__dirname, '../../public/images/imagenes_casas');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawTitle = req.body.title || 'Nueva_Casa';
    const folderName = rawTitle.replace('Modelo ', '').trim().replace(/[^a-zA-Z0-9-ñÑ]/g, '_');
    const folderPath = path.join(ASTRO_PUBLIC_DIR, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors()); // Permite peticiones desde tu frontend (Astro)
app.use(express.json()); // Permite recibir datos en formato JSON

// Ruta de prueba principal
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de Construcciones Web' });
});

// Ruta para obtener todas las propiedades
app.get('/api/properties', async (req, res) => {
  try {
    const [properties] = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    const [images] = await pool.query('SELECT * FROM property_images');
    
    const propsWithImages = properties.map(p => {
        const pImages = images.filter(i => i.property_id === p.id);
        const mainImage = pImages.find(i => i.is_main === 1) || pImages[0];
        return {
            ...p,
            is_exclusive: Boolean(p.is_exclusive),
            is_top: Boolean(p.is_top),
            image_url: mainImage ? mainImage.image_url : null,
            images: pImages
        };
    });
    res.json(propsWithImages);
  } catch (error) {
    console.error('Error obteniendo propiedades:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las propiedades' });
  }
});

// ---- RUTAS DE AUTENTICACION ----
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    
    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: users[0].id, email: users[0].email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { email: users[0].email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// ---- RUTAS CRUD PROTEGIDAS PARA EL ADMIN ----

// Crear casa
app.post('/api/properties', authenticateToken, upload.array('images', 20), async (req, res) => {
  const { title, description, price, area, bedrooms, bathrooms, status } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO properties (title, description, price, area, bedrooms, bathrooms, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, price, area, bedrooms, bathrooms, status || 'disponible']
    );
    const newPropertyId = result.insertId;

    if (req.files && req.files.length > 0) {
      const folderName = title.replace('Modelo ', '').trim().replace(/[^a-zA-Z0-9-ñÑ]/g, '_');
      for (let i = 0; i < req.files.length; i++) {
         const file = req.files[i];
         const imageUrl = `/images/imagenes_casas/${folderName}/${file.filename}`;
         const isMain = i === 0 ? 1 : 0;
         await connection.query(
           'INSERT INTO property_images (property_id, image_url, is_main) VALUES (?, ?, ?)',
           [newPropertyId, imageUrl, isMain]
         );
      }
    }

    await connection.commit();
    res.status(201).json({ id: newPropertyId, message: 'Propiedad creada con éxito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error insertando propiedad:', error);
    res.status(500).json({ error: 'Error del servidor al crear' });
  } finally {
    connection.release();
  }
});

// Editar casa
app.put('/api/properties/:id', authenticateToken, upload.array('images', 20), async (req, res) => {
  const id = req.params.id;
  const { title, description, price, area, bedrooms, bathrooms, status } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE properties SET title=?, description=?, price=?, area=?, bedrooms=?, bathrooms=?, status=? WHERE id=?`,
      [title, description, price, area, bedrooms, bathrooms, status || 'disponible', id]
    );

    if (req.files && req.files.length > 0) {
      const folderName = title.replace('Modelo ', '').trim().replace(/[^a-zA-Z0-9-ñÑ]/g, '_');
      
      const [existingImages] = await connection.query('SELECT * FROM property_images WHERE property_id = ?', [id]);
      const hasMain = existingImages.some(img => img.is_main === 1);

      for (let i = 0; i < req.files.length; i++) {
         const file = req.files[i];
         const imageUrl = `/images/imagenes_casas/${folderName}/${file.filename}`;
         const isMain = (!hasMain && i === 0) ? 1 : 0;
         await connection.query(
           'INSERT INTO property_images (property_id, image_url, is_main) VALUES (?, ?, ?)',
           [id, imageUrl, isMain]
         );
      }
    }

    await connection.commit();
    res.json({ message: 'Propiedad actualizada con éxito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando propiedad:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar' });
  } finally {
    connection.release();
  }
});

// Actualizar destacados (exclusivos y top)
app.put('/api/properties/featured/update', authenticateToken, async (req, res) => {
  const { exclusiveIds, topIds } = req.body;
  if (!Array.isArray(exclusiveIds) || !Array.isArray(topIds)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }
  if (exclusiveIds.length > 4 || topIds.length > 4) {
    return res.status(400).json({ error: 'Máximo 4 propiedades por categoría permitidas' });
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Resetear todos
    await connection.query('UPDATE properties SET is_exclusive = FALSE, is_top = FALSE');
    
    // Asignar exclusivos
    if (exclusiveIds.length > 0) {
      await connection.query('UPDATE properties SET is_exclusive = TRUE WHERE id IN (?)', [exclusiveIds]);
    }
    
    // Asignar top
    if (topIds.length > 0) {
      await connection.query('UPDATE properties SET is_top = TRUE WHERE id IN (?)', [topIds]);
    }

    await connection.commit();
    res.json({ message: 'Propiedades destacadas actualizadas correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando destacados:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar destacados' });
  } finally {
    connection.release();
  }
});

// Eliminar foto individual
app.delete('/api/properties/:propertyId/images/:imageId', authenticateToken, async (req, res) => {
  const { propertyId, imageId } = req.params;
  try {
    await pool.query('DELETE FROM property_images WHERE id = ? AND property_id = ?', [imageId, propertyId]);
    res.json({ message: 'Imagen eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando imagen' });
  }
});

// Eliminar casa
app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = req.params.id;

    // Primero borramos las imágenes para evitar error de foreign key
    await connection.query('DELETE FROM property_images WHERE property_id = ?', [id]);
    
    // Luego borramos la casa
    const [result] = await connection.query('DELETE FROM properties WHERE id = ?', [id]);
    
    await connection.commit();

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json({ message: 'Propiedad eliminada con éxito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error eliminando propiedad:', error);
    res.status(500).json({ error: 'Error eliminando propiedad' });
  } finally {
    connection.release();
  }
});

// ---- RUTAS PARA ARTICULOS (BLOG) ----

// Obtener todos los artículos (Público)
app.get('/api/articles', async (req, res) => {
  try {
    const [articles] = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(articles);
  } catch (error) {
    console.error('Error obteniendo artículos:', error);
    res.status(500).json({ error: 'Error obteniendo artículos' });
  }
});

// Obtener un artículo por ID (Público)
app.get('/api/articles/:id', async (req, res) => {
  try {
    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (articles.length === 0) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(articles[0]);
  } catch (error) {
    console.error('Error obteniendo artículo:', error);
    res.status(500).json({ error: 'Error obteniendo artículo' });
  }
});

// Crear artículo (Protegido)
app.post('/api/articles', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, short_description, content } = req.body;
  let imageUrl = null;
  
  if (req.file) {
    const folderName = 'articulos';
    const folderPath = path.join(ASTRO_PUBLIC_DIR, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    // Mover de la carpeta genérica a la de artículos usando fs.rename (esto asume que multer guardó temporalmente)
    // Pero como tu multer config ya escribe en basado en title, ajustémoslo:
    // La config original dice folderName = req.body.title || 'Nueva_Casa'
    // Como estamos en articulos, la ruta generada servirá pero quedará en imagenes_casas/[Título],
    // que está bien para mantener la compatibilidad sin romper nada.
    const cleanTitle = title.replace(/[^a-zA-Z0-9-ñÑ]/g, '_');
    imageUrl = `/images/imagenes_casas/${cleanTitle}/${req.file.filename}`;
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO articles (title, short_description, content, image_url) VALUES (?, ?, ?, ?)',
      [title, short_description, content, imageUrl]
    );
    res.status(201).json({ id: result.insertId, message: 'Artículo creado con éxito' });
  } catch (error) {
    console.error('Error creando artículo:', error);
    res.status(500).json({ error: 'Error creando artículo' });
  }
});

// Editar artículo (Protegido)
app.put('/api/articles/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const { title, short_description, content } = req.body;
  
  try {
    let updateQuery = 'UPDATE articles SET title = ?, short_description = ?, content = ?';
    let queryParams = [title, short_description, content];

    if (req.file) {
      const cleanTitle = title.replace(/[^a-zA-Z0-9-ñÑ]/g, '_');
      const imageUrl = `/images/imagenes_casas/${cleanTitle}/${req.file.filename}`;
      updateQuery += ', image_url = ?';
      queryParams.push(imageUrl);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    await pool.query(updateQuery, queryParams);
    res.json({ message: 'Artículo actualizado con éxito' });
  } catch (error) {
    console.error('Error actualizando artículo:', error);
    res.status(500).json({ error: 'Error actualizando artículo' });
  }
});

// Eliminar artículo (Protegido)
app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json({ message: 'Artículo eliminado con éxito' });
  } catch (error) {
    console.error('Error eliminando artículo:', error);
    res.status(500).json({ error: 'Error eliminando artículo' });
  }
});

// ---- RUTAS PARA CLIENTES ----

// Obtener todos los clientes (Protegido)
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const [clients] = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(clients);
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error obteniendo clientes' });
  }
});

// Crear solicitud de cliente (Público)
app.post('/api/clients', async (req, res) => {
  const { name, email, phone, model, message } = req.body;
  
  try {
    // Anti-spam: Verificar si hay una solicitud reciente 'new' con el mismo nombre, email y telefono
    const [existing] = await pool.query(
      'SELECT id FROM clients WHERE name = ? AND email = ? AND phone = ? AND status = "new"',
      [name, email, phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya hemos recibido tu solicitud y está pendiente de revisión por nuestro equipo.' });
    }

    const [result] = await pool.query(
      'INSERT INTO clients (name, email, phone, model, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, model, message ? message.substring(0, 500) : null]
    );
    res.status(201).json({ id: result.insertId, message: 'Solicitud enviada con éxito' });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error del servidor al enviar la solicitud' });
  }
});

// Marcar solicitud como leída o OK (Protegido)
app.put('/api/clients/:id/read', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE clients SET status = "read" WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ message: 'Solicitud marcada como leída' });
  } catch (error) {
    console.error('Error actualizando solicitud:', error);
    res.status(500).json({ error: 'Error actualizando solicitud' });
  }
});

// Eliminar solicitud de cliente (Protegido)
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ message: 'Solicitud eliminada con éxito' });
  } catch (error) {
    console.error('Error eliminando solicitud:', error);
    res.status(500).json({ error: 'Error eliminando solicitud' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
