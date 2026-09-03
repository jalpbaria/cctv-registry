import { useState } from 'react';
import { addCamera } from './api';

function AddCameraForm({ token, onCameraAdded, onClose }) {
  const [form, setForm] = useState({
    camera_code: '',
    camera_type: 'fixed',
    latitude: '',
    longitude: '',
    address: '',
    ownership: 'Government',
    connectivity_status: 'online',
    storage_type: 'cloud',
    retention_days: 15,
    installed_on: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await addCamera(token, {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        retention_days: parseInt(form.retention_days, 10),
      });
      onCameraAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add camera');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h3 style={{ marginTop: 0 }}>Add New Camera</h3>

        <input name="camera_code" placeholder="Camera Code (e.g. HD-002)" value={form.camera_code} onChange={handleChange} style={styles.input} required />

        <select name="camera_type" value={form.camera_type} onChange={handleChange} style={styles.input}>
          <option value="fixed">Fixed</option>
          <option value="PTZ">PTZ</option>
          <option value="ANPR">ANPR</option>
        </select>

        <input name="latitude" type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={handleChange} style={styles.input} required />
        <input name="longitude" type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={handleChange} style={styles.input} required />
        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} style={styles.input} required />
        <input name="ownership" placeholder="Ownership" value={form.ownership} onChange={handleChange} style={styles.input} />

        <select name="connectivity_status" value={form.connectivity_status} onChange={handleChange} style={styles.input}>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="unknown">Unknown</option>
        </select>

        <select name="storage_type" value={form.storage_type} onChange={handleChange} style={styles.input}>
          <option value="cloud">Cloud</option>
          <option value="local">Local</option>
        </select>

        <input name="retention_days" type="number" placeholder="Retention Days" value={form.retention_days} onChange={handleChange} style={styles.input} />
        <input name="installed_on" type="date" value={form.installed_on} onChange={handleChange} style={styles.input} required />

        {error && <p style={styles.error}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Adding...' : 'Add Camera'}
          </button>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  form: {
    background: '#1e1e1e',
    padding: '25px',
    borderRadius: '8px',
    width: '340px',
    maxHeight: '85vh',
    overflowY: 'auto',
    color: 'white',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#2a2a2a',
    color: 'white',
    boxSizing: 'border-box',
  },
  submitBtn: {
    flex: 1,
    padding: '10px',
    background: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    background: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '14px',
  },
};

export default AddCameraForm;