export default function PreviewPane({ originalSrc, vectorSrc, processing, onClear }) {
  const previewContainer = {
    width: '100%',
    height: '340px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f9f9f9',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #ddd',
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  };

  // ✅ Download function for Vector Output
  const handleDownload = async () => {
    if (!vectorSrc) return;
  
    const response = await fetch(vectorSrc);
    const blob = await response.blob();
    const mime = blob.type || '';
  
    let ext = 'png';
    if (mime.includes('svg')) ext = 'svg';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('jpeg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
  
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_image.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="preview-grid">
      {/* Original Image */}
      <div className="card" style={{ padding: 12, position: 'relative' }}>
        <div className="label">Original Image</div>
        <div style={previewContainer}>
          {originalSrc ? (
            <img src={originalSrc} alt="original" style={imageStyle} />
          ) : (
            <span style={{ color: '#aaa' }}>No image selected</span>
          )}
        </div>
      </div>

      {/* Vector / Enhanced Output */}
      <div className="card" style={{ padding: 12, position: 'relative' }}>
        <div className="label">Vector Output</div>
        <div style={previewContainer}>
          {processing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.6)',
                zIndex: 2,
              }}
            >
              <div className="spinner" />
            </div>
          )}

          {!processing && vectorSrc ? (
            vectorSrc.endsWith('.svg') ? (
              <iframe
                title="vector"
                src={vectorSrc}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#fff',
                }}
              />
            ) : (
              <img src={vectorSrc} alt="vector-output" style={imageStyle} />
            )
          ) : !processing ? (
            <span style={{ color: '#aaa' }}>Nothing yet – click Convert</span>
          ) : null}
        </div>

        {/* ✅ Clear + Download Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '10px',
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

      {/* ✅ Spinner animation */}
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
