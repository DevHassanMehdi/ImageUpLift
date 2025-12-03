import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GalleryGrid from '../components/GalleryGrid';
import GalleryFilterBar from '../components/GalleryFilterBar';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');
const PAGE_SIZE = 10;

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const loadItems = async (mode = filterMode, targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (mode && mode !== 'all') {
        params.append('mode', mode);
      }
      params.append('page', String(targetPage));
      params.append('page_size', String(PAGE_SIZE));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/conversion/list${qs}`);
      if (!res.ok) {
        throw new Error(`List fetch failed: ${res.status}`);
      }
      const json = await res.json();
      let payload = json;
      let effectivePage = targetPage;

      if (Array.isArray(json)) {
        const total = json.length;
        const fallbackTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
        effectivePage = Math.min(Math.max(1, targetPage), fallbackTotalPages);
        const start = (effectivePage - 1) * PAGE_SIZE;
        payload = {
          items: json.slice(start, start + PAGE_SIZE),
          meta: { total, page: effectivePage, page_size: PAGE_SIZE, total_pages: fallbackTotalPages },
        };
      }

      const meta = payload?.meta || {};
      const totalPagesFromMeta =
        Math.max(1, meta.total_pages || Math.ceil((meta.total || payload.items?.length || 0) / PAGE_SIZE) || 1);

      if (effectivePage > totalPagesFromMeta) {
        setTotalPages(totalPagesFromMeta);
        setPage(totalPagesFromMeta);
        return;
      }

      setItems(payload.items || []);
      setTotalPages(totalPagesFromMeta);
      if (meta.page && meta.page !== effectivePage) {
        setPage(meta.page);
      }
    } catch (err) {
      console.error('Failed to load gallery list', err);
      setError('Failed to load gallery items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(filterMode, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, page]);

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
      await loadItems(filterMode, page);
    } catch (err) {
      console.error('Failed to delete conversion', err);
      alert('Failed to delete conversion');
    }
  };

  const handleFilterChange = (mode) => {
    setFilterMode(mode);
    setPage(1);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage === page || nextPage > totalPages) return;
    setPage(nextPage);
  };

  return (
    <div>
      <GalleryFilterBar
        filterMode={filterMode}
        onChangeFilter={handleFilterChange}
        onRefresh={() => loadItems(filterMode, page)}
        loading={loading}
      />

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
      {!loading && items.length === 0 && (
        <div className="muted" style={{ marginTop: 16 }}>{error ? 'No data available.' : 'No conversions yet.'}</div>
      )}

      {!loading && items.length > 0 && (
        <>
          <GalleryGrid
            items={items}
            apiBase={API_BASE}
            onOpen={handleOpen}
            onDelete={handleDelete}
          />
          <div className="gallery-pagination" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              Previous
            </button>
            <span className="muted">Page {page} of {totalPages}</span>
            <button className="btn btn-secondary" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
