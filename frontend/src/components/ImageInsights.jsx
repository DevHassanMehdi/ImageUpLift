const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const colorSwatch = (rgb, idx) => {
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  const [r, g, b] = rgb;
  const bg = `rgb(${r}, ${g}, ${b})`;
  return (
    <div key={`${bg}-${idx}`} className="swatch" style={{ background: bg }} title={bg} />
  );
};

export default function ImageInsights({ metadata, recommendation }) {
  if (!metadata) {
    return (
      <div className="card insights-card">
        <div className="insights-header">
          <h4>Image Insights</h4>
          <span className="pill pill-ghost">No image</span>
        </div>
        <div className="muted">Upload an image to see its metadata and recommended mode.</div>
      </div>
    );
  }

  const type = metadata.ai_image_type;
  const conf = metadata.ai_confidence ? `${Math.round(metadata.ai_confidence * 100)}%` : null;
  const mode = recommendation?.conversion_mode;
  const vectorize = recommendation?.vector_settings || {};
  const outline = recommendation?.outline_settings || {};

  return (
    <div className="card insights-card">
     <div className="insights-header">
  <h4>Image Insights</h4>

  <span
    className={`pill insights-pill ${
      mode ? mode.toLowerCase() : "none"
    }`}
  >
    {mode ? mode[0].toUpperCase() + mode.slice(1) : "N/A"}
  </span>
</div>

      <div className="insights-grid">
        <InsightRow label="Type" value={`${type || "-"}${conf ? ` · ${conf}` : ""}`} />
        <InsightRow label="Resolution" value={metadata.resolution || "-"} />
        <InsightRow label="Aspect Ratio" value={metadata.aspect_ratio ?? "-"} />
        <InsightRow label="File Size" value={formatBytes(metadata.file_size_bytes)} />
        <InsightRow label="Sharpness" value={metadata.sharpness ?? "-"} />
        <InsightRow label="Noise Level" value={metadata.noise_level ?? "-"} />
        <InsightRow label="Edge Complexity" value={metadata.edge_complexity ?? "-"} />
        <InsightRow label="Colors" value={metadata.color_count ?? "-"} />
      </div>

      {Array.isArray(metadata.dominant_colors) && metadata.dominant_colors.length > 0 && (
        <div className="insight-block">
          <div className="muted">Dominant Colors</div>
          <div className="swatch-row">
            {metadata.dominant_colors.slice(0, 6).map(colorSwatch)}
          </div>
        </div>
      )}

      {mode === "vectorize" && (
        <div className="insight-block">
          <div className="muted">vectorize Settings</div>
          <div className="kv-pair">
            <span>Mode</span><strong>{vectorize.mode || "-"}</strong>
          </div>
          <div className="kv-pair">
            <span>Color Precision</span><strong>{vectorize.color_precision ?? "-"}</strong>
          </div>
          <div className="kv-pair">
            <span>Filter Speckle</span><strong>{vectorize.filter_speckle ?? "-"}</strong>
          </div>
          <div className="kv-pair">
            <span>Gradient Step</span><strong>{vectorize.gradient_step ?? "-"}</strong>
          </div>
        </div>
      )}

      {mode === "outline" && (
        <div className="insight-block">
          <div className="muted">Outline Settings</div>
          <div className="kv-pair">
            <span>Low</span><strong>{outline.low ?? "-"}</strong>
          </div>
          <div className="kv-pair">
            <span>High</span><strong>{outline.high ?? "-"}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="kv insight-row">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
