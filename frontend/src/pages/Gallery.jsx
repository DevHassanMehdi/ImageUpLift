import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GalleryGrid from '../components/GalleryGrid';
import GalleryFilterBar from '../components/GalleryFilterBar';

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

  return (
    <div>
      <GalleryFilterBar
        filterMode={filterMode}
        onChangeFilter={setFilterMode}
        onRefresh={() => loadItems()}
        loading={loading}
      />

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
      {!loading && items.length === 0 && (
        <div className="muted" style={{ marginTop: 16 }}>{error ? 'No data available.' : 'No conversions yet.'}</div>
      )}

      {!loading && items.length > 0 && (
        <GalleryGrid
          items={items}
          apiBase={API_BASE}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
