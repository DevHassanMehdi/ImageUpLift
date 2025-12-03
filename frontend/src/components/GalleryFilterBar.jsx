export default function GalleryFilterBar({
  filterMode,
  onChangeFilter,
  loading,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="card gallery-header">
      <div className="gallery-header__titles">
        <h2>Gallery</h2>
        <p className="muted">Recent converted outputs</p>
      </div>
      <div className="gallery-header__actions" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filterMode}
            onChange={(e) => onChangeFilter(e.target.value)}
            className="select"
          >
            <option value="all">All modes</option>
            <option value="vectorize">Vectorize</option>
            <option value="outline">Outline</option>
            <option value="enhance">Enhance</option>
          </select>
          {loading && <span className="muted">Loading...</span>}
        </div>
        <div className="gallery-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <button className="btn btn-secondary" onClick={onPrevPage} disabled={page <= 1} style={{ minWidth: 90 }}>
            Previous
          </button>
          <span className="muted" style={{ minWidth: 120, textAlign: 'center' }}>
            Page {page} / {totalPages}
          </span>
          <button className="btn btn-secondary" onClick={onNextPage} disabled={page >= totalPages} style={{ minWidth: 90 }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
