import { useState, useRef } from "react";

export default function PreviewPane({ originalSrc, vectorSrc, processing, onClear }) {
  const [originalZoom, setOriginalZoom] = useState(1);
  const [vectorZoom, setVectorZoom] = useState(1);
  const [originalOffset, setOriginalOffset] = useState({ x: 0, y: 0 });
  const [vectorOffset, setVectorOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const zoomStep = 0.25;
  const maxZoom = 4;
  const minZoom = 1;

  const handleZoom = (type, direction) => {
    const setter = type === "original" ? setOriginalZoom : setVectorZoom;
    setter((z) => Math.min(maxZoom, Math.max(minZoom, z + direction * zoomStep)));
  };

  const startDrag = (type, e) => {
    if (type === "original" && originalZoom === 1) return;
    if (type === "vector" && vectorZoom === 1) return;
    setDragging(type);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleDrag = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };

    if (dragging === "original") {
      setOriginalOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    } else {
      setVectorOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  };

  const endDrag = () => setDragging(null);

  const resetView = (type) => {
    if (type === "original") {
      setOriginalZoom((z) => (z > 1 ? 1 : z + zoomStep));
      setOriginalOffset({ x: 0, y: 0 });
    } else {
      setVectorZoom((z) => (z > 1 ? 1 : z + zoomStep));
      setVectorOffset({ x: 0, y: 0 });
    }
  };

  const previewContainer = {
    width: "100%",
    height: "340px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9f9f9",
    borderRadius: "8px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid #ddd",
    userSelect: "none",
    cursor: dragging ? "grabbing" : "grab",
  };

  const imageStyle = (zoom, offset) => ({
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
    transition: dragging ? "none" : "transform 0.2s ease",
    cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
  });

  // ✅ Download function for Vector Output
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
    <div className="preview-grid" onMouseMove={handleDrag} onMouseUp={endDrag} onMouseLeave={endDrag}>
      {/* Original Image */}
      <div className="card" style={{ padding: 12, position: "relative" }}>
        <div className="label">Original Image</div>
        <div
          style={previewContainer}
          onWheel={(e) => handleZoom("original", e.deltaY < 0 ? 1 : -1)}
          onMouseDown={(e) => startDrag("original", e)}
          onClick={() => resetView("original")}
        >
          {originalSrc ? (
            <img
              src={originalSrc}
              alt="original"
              style={imageStyle(originalZoom, originalOffset)}
              draggable={false}
            />
          ) : (
            <span style={{ color: "#aaa" }}>No image selected</span>
          )}
        </div>
      </div>

      {/* Vector / Enhanced Output */}
      <div className="card" style={{ padding: 12, position: "relative" }}>
        <div className="label">Vector Output</div>
        <div
          style={previewContainer}
          onWheel={(e) => handleZoom("vector", e.deltaY < 0 ? 1 : -1)}
          onMouseDown={(e) => startDrag("vector", e)}
          onClick={() => resetView("vector")}
        >
          {processing && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.6)",
                zIndex: 2,
              }}
            >
              <div className="spinner" />
            </div>
          )}

          {!processing && vectorSrc ? (
            vectorSrc.endsWith(".svg") ? (
              <iframe
                title="vector"
                src={vectorSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff",
                  transform: `scale(${vectorZoom}) translate(${vectorOffset.x / vectorZoom}px, ${vectorOffset.y / vectorZoom}px)`,
                  transition: dragging ? "none" : "transform 0.2s ease",
                  cursor: vectorZoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
                }}
              />
            ) : (
              <img
                src={vectorSrc}
                alt="vector-output"
                style={imageStyle(vectorZoom, vectorOffset)}
                draggable={false}
              />
            )
          ) : !processing ? (
            <span style={{ color: "#aaa" }}>Nothing yet – click Convert</span>
          ) : null}
        </div>

        {/* Buttons below */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onClear}
            disabled={processing}
          >
            🧹 Clear
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={!vectorSrc || processing}
          >
            💾 Download
          </button>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          width: 42px;
          height: 42px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
