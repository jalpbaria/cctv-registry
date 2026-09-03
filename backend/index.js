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


// GET analytics summary — aggregated stats for the dashboard
// Respects the same department isolation rule as GET /api/cameras
app.get('/api/analytics/summary', requireAuth, async (req, res) => {
  try {
    let deptFilter = '';
    let params = [];

    if (req.user.role !== 'admin') {
      deptFilter = ` WHERE department = (SELECT name FROM departments WHERE id = $1)`;
      params.push(req.user.department_id);
    }

    const [
      totalResult,
      byDepartment,
      byStatus,
      byType,
      byOwnership,
      byStorage,
      byMonth,
      avgRetention,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM cameras${deptFilter}`, params),
      pool.query(
        `SELECT department, COUNT(*) AS count FROM cameras${deptFilter} GROUP BY department ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT connectivity_status, COUNT(*) AS count FROM cameras${deptFilter} GROUP BY connectivity_status ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT camera_type, COUNT(*) AS count FROM cameras${deptFilter} GROUP BY camera_type ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT ownership, COUNT(*) AS count FROM cameras${deptFilter} GROUP BY ownership ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT storage_type, COUNT(*) AS count FROM cameras${deptFilter} GROUP BY storage_type ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT TO_CHAR(installed_on, 'YYYY-MM') AS month, COUNT(*) AS count
         FROM cameras${deptFilter}
         GROUP BY month ORDER BY month ASC`,
        params
      ),
      pool.query(`SELECT AVG(retention_days) AS avg_retention FROM cameras${deptFilter}`, params),
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].count, 10),
      byDepartment: byDepartment.rows,
      byConnectivityStatus: byStatus.rows,
      byCameraType: byType.rows,
      byOwnership: byOwnership.rows,
      byStorageType: byStorage.rows,
      installsByMonth: byMonth.rows,
      avgRetentionDays: avgRetention.rows[0].avg_retention
        ? Math.round(avgRetention.rows[0].avg_retention)
        : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));