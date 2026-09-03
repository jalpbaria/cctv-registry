const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();
const authRoutes = require('./auth');
const { requireAuth } = require('./middleware');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
// Health check — visit this in a browser to confirm the server is alive
app.get('/', (req, res) => {
  res.send('CCTV Registry API is running');
});

// GET all cameras (with lat/long extracted for the map)
app.get('/api/cameras', requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT id, camera_code, department, camera_type, address, ownership,
             connectivity_status, storage_type, retention_days, installed_on,
             ST_Y(location::geometry) AS latitude,
             ST_X(location::geometry) AS longitude
      FROM cameras
    `;
    let params = [];

    // Non-admins only see their own department's cameras
    if (req.user.role !== 'admin') {
      query += ` WHERE department = (SELECT name FROM departments WHERE id = $1)`;
      params.push(req.user.department_id);
    }

    query += ` ORDER BY id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// POST — add a new camera
app.post('/api/cameras', requireAuth, async (req, res) => {
  const {
    camera_code, camera_type, latitude, longitude,
    address, ownership, connectivity_status, storage_type,
    retention_days, installed_on
  } = req.body;

  try {
    // Get the department name from the logged-in user's department_id
    const deptResult = await pool.query(
      `SELECT name FROM departments WHERE id = $1`,
      [req.user.department_id]
    );

    if (deptResult.rows.length === 0) {
      return res.status(400).json({ error: 'User has no valid department' });
    }

    const department = deptResult.rows[0].name;

    const result = await pool.query(
      `INSERT INTO cameras
        (camera_code, department, camera_type, location, address, ownership,
         connectivity_status, storage_type, retention_days, installed_on)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [camera_code, department, camera_type, longitude, latitude, address,
       ownership, connectivity_status, storage_type, retention_days, installed_on]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Camera added' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Camera code already exists' });
    }
    res.status(500).json({ error: 'Failed to add camera' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));