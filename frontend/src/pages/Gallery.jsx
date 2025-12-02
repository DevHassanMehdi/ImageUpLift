import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const navigate = useNavigate();

  const loadItems = async (mode = filterMode) => {
    setLoading(true);
    setError('');
    try {
      const qs = mode && mode !== 'all' ? `?mode=${encodeURIComponent(mode)}` : '';
      const res = await fetch(`${API_BASE}/conversion/list${qs}`);
      if (!res.ok) {
        throw new Error(`List fetch failed: ${res.status}`);
      }
      const json = await res.json();
      setItems(json || []);
    } catch (err) {
      console.error('Failed to load gallery list', err);
      setError('Failed to load gallery items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode]);

  const handleOpen = (id) => {
    navigate(`/convert?conversionId=${id}`);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const ok = window.confirm('Delete this conversion?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/conversion/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (err) {
      console.error('Failed to delete conversion', err);
      alert('Failed to delete conversion');
    }
  };

  const renderSummary = (item) => {
    const params = item.chosen_params || {};
    if (item.mode === 'outline') {
      return `Outline low/high: ${params.low ?? '?'} / ${params.high ?? '?'}`;
    }
    if (item.mode === 'enhance') {
      const scale = params.scale ?? params.upscale ?? '4';
      return `Enhance (scale ${scale}x)`;
    }
    // vectorize default
    return `Hier: ${params.hierarchical ?? 'stacked'} • Colors: ${params.color_precision ?? params.colorPrecision ?? '?'} • Mode: ${params.mode ?? 'spline'}`;
  };

  return (
    <div>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Gallery</h2>
            <p className="muted" style={{ margin: 0 }}>Recent converted outputs</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d4d4d8', background: '#fff', fontWeight: 600 }}
            >
              <option value="all">All modes</option>
              <option value="vectorize">Vectorize</option>
              <option value="outline">Outline</option>
              <option value="enhance">Enhance</option>
            </select>
            <button className="btn btn-secondary" onClick={() => loadItems()} disabled={loading}>Refresh</button>
            {loading && <span className="muted">Loading...</span>}
          </div>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        {!loading && items.length === 0 && (
          <div className="muted" style={{ marginTop: 16 }}>{error ? 'No data available.' : 'No conversions yet.'}</div>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div
          className="grid gallery-grid"
          style={{
            marginTop: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {items.map(item => {
            const hasThumb = item.output_size_bytes && item.output_size_bytes > 0 && item.output_mime;
            const thumbUrl = hasThumb ? `${API_BASE}/conversion/output/${item.id}` : '/logo.svg';
            const badge = item.mode ? item.mode.toUpperCase() : 'OUTPUT';
            const mime = item.output_mime || '';
            return (
              <div
                key={item.id}
                className="card gallery-card"
                style={{
                  padding: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 300,
                  maxHeight: 320,
                }}
                onClick={() => handleOpen(item.id)}
              >
                <div className="gallery-thumb" style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#f8fafc', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={thumbUrl}
                    alt={item.image_name || 'Converted'}
                    loading="lazy"
                    onError={(e) => {
                      if (e.target.dataset.fallback) return;
                      e.target.dataset.fallback = '1';
                      e.target.src = '/logo.svg';
                    }}
                    style={{ width: '100%', height: 200, objectFit: 'contain' }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6 }}>
                    <span className="pill pill-ghost">{badge}</span>
                    {mime && <span className="pill pill-ghost" style={{ background: '#eef2ff', color: '#3730a3' }}>{mime}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8, justifyContent: 'space-between' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.image_name || 'Converted'}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{renderSummary(item)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="tiny" onClick={(e) => handleDelete(e, item.id)} aria-label="Delete">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
