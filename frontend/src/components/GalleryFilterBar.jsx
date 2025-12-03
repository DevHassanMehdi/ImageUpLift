export default function GalleryFilterBar({ filterMode, onChangeFilter, onRefresh, loading }) {
  return (
    <div className="card gallery-header">
      <div className="gallery-header__titles">
        <h2>Gallery</h2>
        <p className="muted">Recent converted outputs</p>
      </div>
      <div className="gallery-header__actions">
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
        <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>Refresh</button>
        {loading && <span className="muted">Loading...</span>}
      </div>
    </div>
  );
}
