import { useState, useEffect } from 'react';
import AddCameraForm from './AddCameraForm';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Login from './Login';
import { getCameras } from './api';

// Fix for default marker icons not showing in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function App() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    getCameras(token)
      .then((res) => {
        setCameras(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching cameras:', err);
        setLoading(false);
        // If token is invalid/expired, log the user out
        if (err.response?.status === 401) {
          handleLogout();
        }
      });
  }, [token]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCameras([]);
  };

  const refreshCameras = () => {
    setLoading(true);
    getCameras(token)
      .then((res) => {
        setCameras(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  // Not logged in — show login screen
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const defaultCenter = [23.0225, 72.5714];

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <div
        style={{
          padding: '10px 20px',
          background: '#1a1a1a',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>CCTV Camera Registry</h2>
          <p style={{ margin: 0 }}>
            {loading
              ? 'Loading cameras...'
              : `${cameras.length} camera(s) — ${user.department || 'All Departments'} (${user.role})`}
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '8px 16px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            + Add Camera
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: 'calc(100vh - 70px)', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {cameras.map((camera) => (
          <Marker key={camera.id} position={[camera.latitude, camera.longitude]}>
            <Popup>
              <strong>{camera.camera_code}</strong><br />
              Department: {camera.department}<br />
              Type: {camera.camera_type}<br />
              Status: {camera.connectivity_status}<br />
              Address: {camera.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showAddForm && (
        <AddCameraForm
          token={token}
          onCameraAdded={refreshCameras}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

export default App;