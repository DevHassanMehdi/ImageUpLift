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
      <div className="card gallery-header">
        <div className="gallery-header__titles">
          <h2>Gallery</h2>
          <p className="muted">Recent converted outputs</p>
        </div>
        <div className="gallery-header__actions">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value)}
            className="select"
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

      {!loading && items.length > 0 && (
        <div className="gallery-grid">
          {items.map(item => {
            const hasThumb = item.output_size_bytes && item.output_size_bytes > 0 && item.output_mime;
            const thumbUrl = hasThumb ? `${API_BASE}/conversion/output/${item.id}` : '/logo.svg';
            const badge = item.mode ? item.mode.toUpperCase() : 'OUTPUT';
            const mime = item.output_mime || '';
            return (
              <div
                key={item.id}
                className="card gallery-card"
                onClick={() => handleOpen(item.id)}
              >
                <div className="gallery-thumb">
                  <img
                    src={thumbUrl}
                    alt={item.image_name || 'Converted'}
                    loading="lazy"
                    onError={(e) => {
                      if (e.target.dataset.fallback) return;
                      e.target.dataset.fallback = '1';
                      e.target.src = '/logo.svg';
                    }}
                    className="gallery-img"
                  />
                  <div className="gallery-badges">
                    <span className="pill pill-ghost">{badge}</span>
                    {mime && <span className="pill pill-ghost gallery-mime">{mime}</span>}
                  </div>
                </div>
                <div className="gallery-meta">
                  <div className="gallery-meta__text">
                    <div className="gallery-title">
                      {item.image_name || 'Converted'}
                    </div>
                    <div className="muted gallery-summary">{renderSummary(item)}</div>
                  </div>
                  <div className="gallery-actions">
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
