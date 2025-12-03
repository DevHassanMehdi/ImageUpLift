import { useEffect, useRef } from 'react';
import { updateConvertCache } from '../state/convertCache';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');

export default function SettingsPanel({
  settings,
  setSettings,
  canConvert,
  loading,
  setLoading,
  file,
  setVectorSrc,
  recommending,
  outlineLow,
  outlineHigh,
  setOutlineLow,
  setOutlineHigh,
  notify
}) {
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const set = (k, v) => setSettings({ ...settings, [k]: v });

  const handleConvert = async () => {
    if (!canConvert || loading || recommending) return;
    if (!file) {
      alert("Please upload an image file before converting.");
      return;
    }

    try {
      if (mountedRef.current) setLoading(true);
      updateConvertCache({ isConverting: true, vectorSrc: '' });
      console.log("Sending conversion request to:", `${API_BASE}/conversion/convert`);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("outputType", settings.outputType);

      // vectorize mode params
      if (settings.outputType === "vectorize") {
        fd.append("hierarchical", settings.hierarchical);
        fd.append("filter_speckle", settings.filterSpeckle);
        fd.append("color_precision", settings.colorPrecision);
        fd.append("gradient_step", settings.gradientStep);
        fd.append("mode", settings.mode);

        if (settings.mode === "spline") {
          fd.append("corner_threshold", settings.cornerThreshold);
          fd.append("segment_length", settings.segmentLength);
          fd.append("splice_threshold", settings.spliceThreshold);
        }
      }

      // Outline mode params
      if (settings.outputType === "outline") {
        fd.append("low", outlineLow);
        fd.append("high", outlineHigh);
      }

      const response = await fetch(`${API_BASE}/conversion/convert`, {
        method: 'POST',
        mode: 'cors',
        body: fd,
        headers: {
          'Accept': 'application/json, image/svg+xml, image/png, image/webp',
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errText}`);
      }

      const contentType = response.headers.get('content-type');
      if (
        contentType?.includes('image/svg+xml') ||
        contentType?.includes('image/png') ||
        contentType?.includes('image/webp')
      ) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log("Image received:", url);
        if (mountedRef.current) setVectorSrc(url);
        updateConvertCache({ vectorSrc: url });
        notify?.('Conversion completed', 'success');
      } else {
        const json = await response.json();
        notify?.(`Conversion successful: ${json.message || 'done'}`, 'success');
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      notify?.('Conversion failed. Check console for details.', 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
      updateConvertCache({ isConverting: false });
    }
  };

  const showVectorSettings = settings.outputType === 'vectorize';
  const showOutlineSettings = settings.outputType === 'outline';
  const showEnhanceSettings = settings.outputType === 'enhance';
  const busy = loading || recommending;

  return (
    <aside className="side">
      <div className="section">
        <h3 style={{ margin: '4px 0 12px 0' }}>Conversion Settings</h3>
        <div className="kv">
          <span className="badge">Output Type</span>
        </div>
        <div className="group" style={{ marginTop: 8 }}>
          {['vectorize', 'outline', 'enhance'].map(k => (
            <button
              key={k}
              className={`btn btn-ghost ${settings.outputType === k ? 'active' : ''}`}
              onClick={() => set('outputType', k)}
              disabled={recommending}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* --- vectorize Mode Settings (Updated) --- */}
      {showVectorSettings && (
        <>
          {/* Hierarchical */}
          <div className="section">
            <div className="kv"><span className="badge">Hierarchical</span></div>
            <div className="group" style={{ marginTop: 8 }}>
              {['stacked', 'cutout'].map(k => (
                <button
                  key={k}
                  className={`btn btn-ghost ${settings.hierarchical === k ? 'active' : ''}`}
                  onClick={() => set('hierarchical', k)}
                  disabled={recommending}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Speckle */}
          <div className="section">
            <div className="kv">
              <span className="badge">Filter Speckle</span>
              <span>{settings.filterSpeckle}</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="16"
              step="1"
              value={settings.filterSpeckle}
              onChange={e => set('filterSpeckle', Number(e.target.value))}
              disabled={recommending}
            />
          </div>

          {/* Color Precision */}
          <div className="section">
            <div className="kv">
              <span className="badge">Color Precision</span>
              <span>{settings.colorPrecision}</span>
            </div>
            <input
              type="range"
              className="slider"
              min="1"
              max="8"
              step="1"
              value={settings.colorPrecision}
              onChange={e => set('colorPrecision', Number(e.target.value))}
              disabled={recommending}
            />
          </div>

          {/* Gradient Step */}
          <div className="section">
            <div className="kv">
              <span className="badge">Gradient Step</span>
              <span>{settings.gradientStep}</span>
            </div>
            <input
              type="range"
              className="slider"
              min="1"
              max="128"
              step="1"
              value={settings.gradientStep}
              onChange={e => set('gradientStep', Number(e.target.value))}
              disabled={recommending}
            />
          </div>          {/* Mode */}
          <div className="section">
            <div className="kv"><span className="badge">Mode</span></div>
            <div className="group" style={{ marginTop: 8 }}>
              {['pixel', 'polygon', 'spline'].map(k => (
                <button
                  key={k}
                  className={`btn btn-ghost ${settings.mode === k ? 'active' : ''}`}
                  onClick={() => set('mode', k)}
                  disabled={recommending}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Spline-specific controls */}
          {settings.mode === 'spline' && (
            <>
              <div className="section">
                <div className="kv">
                  <span className="badge">Corner Threshold</span>
                  <span>{settings.cornerThreshold}</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="180"
                  step="1"
                  value={settings.cornerThreshold}
                  onChange={e => set('cornerThreshold', Number(e.target.value))}
                  disabled={recommending}
                />
              </div>

              <div className="section">
                <div className="kv">
                  <span className="badge">Segment Length</span>
                  <span>{settings.segmentLength}</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.segmentLength}
                  onChange={e => set('segmentLength', Number(e.target.value))}
                  disabled={recommending}
                />
              </div>

              <div className="section">
                <div className="kv">
                  <span className="badge">Splice Threshold</span>
                  <span>{settings.spliceThreshold}</span>
                </div>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="180"
                  step="1"
                  value={settings.spliceThreshold}
                  onChange={e => set('spliceThreshold', Number(e.target.value))}
                  disabled={recommending}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* --- Outline Mode Settings --- */}
      {showOutlineSettings && (
        <>
          <div className="section">
            <div className="kv">
              <span className="badge">Low Threshold</span>
              <span>{outlineLow}</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="255"
              step="1"
              value={outlineLow}
              onChange={e => setOutlineLow(Number(e.target.value))}
              disabled={recommending}
            />
          </div>

          <div className="section">
            <div className="kv">
              <span className="badge">High Threshold</span>
              <span>{outlineHigh}</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="255"
              step="1"
              value={outlineHigh}
              onChange={e => setOutlineHigh(Number(e.target.value))}
              disabled={recommending}
            />
          </div>
        </>
      )}

      {/* --- Enhance Mode --- */}
      {showEnhanceSettings && (
        <div className="section">
          <p style={{ fontSize: 14, color: '#666' }}>
            This mode uses Real-ESRGAN to upscale and enhance your image.
          </p>
        </div>
      )}

      <div className="hr" />

      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={!canConvert || busy || !file}
        onClick={handleConvert}
      >
      <span className={`convert-status ${loading ? "loading" : recommending ? "recommending" : "idle"}`}>
  {loading
    ? "Converting…"
    : recommending
    ? "Getting recommendation…"
    : "Convert"}
</span>

      </button>
    </aside>
  );
}

