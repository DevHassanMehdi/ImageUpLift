import { useRef, useState, useEffect } from "react";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function PreviewPane({ originalSrc, vectorSrc, processing, onClear }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [divider, setDivider] = useState(0.5);
  const [isPanning, setIsPanning] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDivider(0.5);
  }, [originalSrc, vectorSrc]);

  const applyZoom = (delta, evt) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const minZoom = 1;
    const maxZoom = 8;
    const step = 0.12;
    const next = clamp(zoom + delta * step, minZoom, maxZoom);

    if (!rect || next === zoom) {
      setZoom(next);
      return;
    }

    // Zoom toward pointer position: adjust offset so the point under cursor stays put
    const cx = evt.clientX - rect.left - rect.width / 2;
    const cy = evt.clientY - rect.top - rect.height / 2;
    const scale = next / zoom;
    setOffset((prev) => ({
      x: prev.x - cx * (scale - 1),
      y: prev.y - cy * (scale - 1),
    }));
    setZoom(next);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    applyZoom(direction, e);
  };

  const handlePointerDown = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dividerX = rect.left + divider * rect.width;
    const nearDivider = Math.abs(e.clientX - dividerX) < 14;

    if (nearDivider) {
      setIsDividing(true);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = offset;
    }
  };

  const handlePointerMove = (e) => {
    if (isDividing && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0.08, 0.92);
      setDivider(ratio);
      return;
    }

    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setIsDividing(false);
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const layerStyle = (clipLeft, clipRight) => ({
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    clipPath: `inset(0 ${clipRight * 100}% 0 ${clipLeft * 100}%)`,
    background: "#f8fafc",
  });

  const contentStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
    transformOrigin: "center center",
    transition: isPanning || isDividing ? "none" : "transform 0.12s ease",
    pointerEvents: "none",
  };

  const placeholder = (text) => (
    <div className="preview-empty">
      {text}
    </div>
  );

  const showCompare = originalSrc && vectorSrc;

  return (
    <div className="card compare-card">
      <div className="compare-head">
        <div className="pill">Original</div>
        <div style={{ flex: 1 }} />
        <div className="pill pill-ghost">Output</div>
        <div className="compare-actions">
          <button className="tiny" onClick={() => applyZoom(1, { clientX: canvasRef.current?.getBoundingClientRect().left + (canvasRef.current?.getBoundingClientRect().width || 0) / 2 || 0, clientY: canvasRef.current?.getBoundingClientRect().top + (canvasRef.current?.getBoundingClientRect().height || 0) / 2 || 0 })} aria-label="Zoom in">+</button>
          <button className="tiny" onClick={() => applyZoom(-1, { clientX: canvasRef.current?.getBoundingClientRect().left + (canvasRef.current?.getBoundingClientRect().width || 0) / 2 || 0, clientY: canvasRef.current?.getBoundingClientRect().top + (canvasRef.current?.getBoundingClientRect().height || 0) / 2 || 0 })} aria-label="Zoom out">−</button>
          <button className="tiny" onClick={resetView} aria-label="Reset view">Reset</button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="compare-canvas"
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        {!showCompare && (
          <div className="preview-empty">Upload and convert to compare</div>
        )}

        {showCompare && (
          <>
            <div style={layerStyle(0, 1 - divider)}>
              <img src={originalSrc} alt="original" style={contentStyle} />
            </div>
            <div style={layerStyle(divider, 0)}>
              {vectorSrc.endsWith(".svg") ? (
                <img src={vectorSrc} alt="output" style={contentStyle} />
              ) : (
                <img src={vectorSrc} alt="output" style={contentStyle} />
              )}
            </div>

            <div
              className="divider-line"
              style={{ left: `${divider * 100}%` }}
              onMouseDown={handlePointerDown}
            >
              <div className="divider-handle" />
            </div>
          </>
        )}

        {processing && (
          <div className="loading-sheet">
            <div className="spinner" />
            <div className="muted">Processing…</div>
          </div>
        )}
      </div>

      <div className="compare-footer">
        <span className="muted">Pan: drag · Zoom: wheel / + / - · Slide center line to reveal more</span>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={onClear} disabled={processing}>Clear</button>
          <DownloadButton vectorSrc={vectorSrc} processing={processing} />
        </div>
      </div>
    </div>
  );
}

function DownloadButton({ vectorSrc, processing }) {
  const handleDownload = async () => {
    if (!vectorSrc) return;

    const response = await fetch(vectorSrc);
    const blob = await response.blob();
    const mime = blob.type || "";

    let ext = "png";
    if (mime.includes("svg")) ext = "svg";
    else if (mime.includes("webp")) ext = "webp";
    else if (mime.includes("jpeg")) ext = "jpg";
    else if (mime.includes("png")) ext = "png";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted_image.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="btn btn-primary"
      onClick={handleDownload}
      disabled={!vectorSrc || processing}
    >
      Download
    </button>
  );
}
