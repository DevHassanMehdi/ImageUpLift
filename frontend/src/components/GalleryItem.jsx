export default function GalleryItem({ item, thumbUrl, badge, mime, onOpen, onDelete }) {
  return (
    <div
      className="card gallery-card"
      onClick={() => onOpen(item.id)}
    >
      <div className="gallery-thumb">
        <img
          src={thumbUrl}
          alt={item.image_name || "Converted"}
          loading="lazy"
          onError={(e) => {
            if (e.target.dataset.fallback) return;
            e.target.dataset.fallback = "1";
            e.target.src = "/logo.svg";
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
            {item.image_name || "Converted"}
          </div>
          <div className="muted gallery-summary">{renderSummary(item)}</div>
        </div>
        <div className="gallery-actions">
          <button className="tiny" onClick={(e) => onDelete(e, item.id)} aria-label="Delete">✕</button>
        </div>
      </div>
    </div>
  );
}

function renderSummary(item) {
  const params = item.chosen_params || {};
  if (item.mode === "outline") {
    return `Outline low/high: ${params.low ?? "?"} / ${params.high ?? "?"}`;
  }
  if (item.mode === "enhance") {
    const scale = params.scale ?? params.upscale ?? "4";
    return `Enhance (scale ${scale}x)`;
  }
  return `Hier: ${params.hierarchical ?? "stacked"} • Colors: ${params.color_precision ?? params.colorPrecision ?? "?"} • Mode: ${params.mode ?? "spline"}`;
}
