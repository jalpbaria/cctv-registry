import { useState, useEffect } from 'react';
import { getAnalytics } from './api';

const STATUS_COLORS = {
  online: '#22c55e',
  offline: '#ef4444',
  degraded: '#f59e0b',
};

const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

function colorFor(label, index) {
  return STATUS_COLORS[String(label).toLowerCase()] || PALETTE[index % PALETTE.length];
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function BarList({ title, data, labelKey, countKey = 'count' }) {
  const max = data.reduce((m, d) => Math.max(m, Number(d[countKey])), 0) || 1;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {data.length === 0 && <p style={styles.emptyText}>No data</p>}
      {data.map((row, i) => {
        const label = row[labelKey] || 'Unspecified';
        const count = Number(row[countKey]);
        const pct = Math.round((count / max) * 100);
        return (
          <div key={label} style={styles.barRow}>
            <div style={styles.barLabelRow}>
              <span>{label}</span>
              <span style={styles.barCount}>{count}</span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${pct}%`,
                  background: colorFor(label, i),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ title, data, labelKey, countKey = 'count' }) {
  const total = data.reduce((sum, d) => sum + Number(d[countKey]), 0) || 1;

  let cumulative = 0;
  const segments = data.map((row, i) => {
    const value = Number(row[countKey]);
    const start = (cumulative / total) * 360;
    cumulative += value;
    const end = (cumulative / total) * 360;
    return { label: row[labelKey] || 'Unspecified', value, start, end, color: colorFor(row[labelKey], i) };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(', ');

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.donutRow}>
        <div
          style={{
            ...styles.donut,
            background: data.length ? `conic-gradient(${gradient})` : '#333',
          }}
        >
          <div style={styles.donutHole}>{total}</div>
        </div>
        <div style={styles.legend}>
          {segments.map((s) => (
            <div key={s.label} style={styles.legendRow}>
              <span style={{ ...styles.legendSwatch, background: s.color }} />
              <span>{s.label}</span>
              <span style={styles.legendCount}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Timeline({ data }) {
  const max = data.reduce((m, d) => Math.max(m, Number(d.count)), 0) || 1;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Installs Over Time</h3>
      {data.length === 0 && <p style={styles.emptyText}>No data</p>}
      <div style={styles.timelineRow}>
        {data.map((row) => {
          const heightPct = Math.round((Number(row.count) / max) * 100);
          return (
            <div key={row.month} style={styles.timelineCol}>
              <div style={styles.timelineBarTrack}>
                <div style={{ ...styles.timelineBarFill, height: `${heightPct}%` }} />
              </div>
              <div style={styles.timelineLabel}>{row.month}</div>
              <div style={styles.timelineCount}>{row.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsDashboard({ token, scopeLabel }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getAnalytics(token)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching analytics:', err);
        setError(err.response?.data?.error || 'Failed to load analytics');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <div style={styles.centerMessage}>Loading analytics...</div>;
  }

  if (error) {
    return <div style={{ ...styles.centerMessage, color: '#f87171' }}>{error}</div>;
  }

  if (!data) return null;

  return (
    <div style={styles.page}>
      <div style={styles.statsGrid}>
        <StatCard label="Total Cameras" value={data.total} />
        <StatCard label="Departments" value={data.byDepartment.length} />
        <StatCard label="Avg. Retention (days)" value={data.avgRetentionDays} />
        <StatCard
          label="Online"
          value={
            data.byConnectivityStatus.find(
              (s) => String(s.connectivity_status).toLowerCase() === 'online'
            )?.count || 0
          }
        />
      </div>

      <div style={styles.grid}>
        <BarList title="Cameras by Department" data={data.byDepartment} labelKey="department" />
        <BarList
          title="Connectivity Status"
          data={data.byConnectivityStatus}
          labelKey="connectivity_status"
        />
        <BarList title="Camera Type" data={data.byCameraType} labelKey="camera_type" />
        <Donut title="Ownership" data={data.byOwnership} labelKey="ownership" />
        <BarList title="Storage Type" data={data.byStorageType} labelKey="storage_type" />
        <Timeline data={data.installsByMonth} />
      </div>

      {scopeLabel && <p style={styles.scopeNote}>Showing data for: {scopeLabel}</p>}
    </div>
  );
}

const styles = {
  page: {
    padding: '24px',
    background: '#111',
    minHeight: 'calc(100vh - 70px)',
    color: 'white',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  centerMessage: {
    height: 'calc(100vh - 70px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    background: '#111',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#1e1e1e',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #2a2a2a',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    marginTop: '6px',
    color: '#aaa',
    fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#1e1e1e',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    color: '#ddd',
  },
  emptyText: {
    color: '#777',
    fontSize: '13px',
  },
  barRow: {
    marginBottom: '12px',
  },
  barLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '4px',
    color: '#ddd',
  },
  barCount: {
    color: '#999',
  },
  barTrack: {
    height: '8px',
    borderRadius: '4px',
    background: '#2a2a2a',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  donutRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  donut: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  donutHole: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: '#1e1e1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#ddd',
  },
  legendSwatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  legendCount: {
    marginLeft: 'auto',
    color: '#999',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    height: '140px',
    overflowX: 'auto',
    paddingTop: '8px',
  },
  timelineCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '36px',
  },
  timelineBarTrack: {
    height: '90px',
    width: '18px',
    display: 'flex',
    alignItems: 'flex-end',
    background: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  timelineBarFill: {
    width: '100%',
    background: '#3b82f6',
  },
  timelineLabel: {
    fontSize: '10px',
    color: '#999',
    marginTop: '6px',
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    height: '40px',
  },
  timelineCount: {
    fontSize: '11px',
    color: '#ddd',
    marginTop: '2px',
  },
  scopeNote: {
    marginTop: '20px',
    color: '#666',
    fontSize: '12px',
  },
};

export default AnalyticsDashboard;