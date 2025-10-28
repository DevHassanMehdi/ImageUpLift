import { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

export default function SettingsPanel({
  settings, setSettings, canConvert, loading, setLoading, file, setVectorSrc
}) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });

  // Default Outline slider values
  const [outlineLow, setOutlineLow] = useState(100);
  const [outlineHigh, setOutlineHigh] = useState(200);

  const handleConvert = async () => {
    if (!canConvert || loading) return;
    if (!file) {
      alert("Please upload an image file before converting.");
      return;
    }

    try {
      // ✅ Start loading spinner
      setLoading(true);
      console.log("📡 Sending conversion request to:", `${API_BASE}/conversion/convert`);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("outputType", settings.outputType);
      fd.append("quality", settings.quality);
      fd.append("detail", settings.detail);
      fd.append("colorReduction", settings.colorReduction);

      // 👇 Include Outline parameters
      if (settings.outputType === "outline") {
        fd.append("low", outlineLow);
        fd.append("high", outlineHigh);
      }

      // 👇 No extra params needed for Enhance

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
        throw new Error(`Server error: ${response.status} → ${errText}`);
      }

      const contentType = response.headers.get('content-type');

      if (
        contentType?.includes('image/svg+xml') ||
        contentType?.includes('image/png') ||
        contentType?.includes('image/webp')
      ) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log("✅ Image received:", url);

        // ✅ Update preview on right panel
        setVectorSrc(url);
      } else {
        const json = await response.json();
        alert(`✅ Conversion successful: ${json.message || JSON.stringify(json)}`);
      }
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      alert('❌ Conversion failed. Check console for details.');
    } finally {
      // ✅ Stop spinner after processing
      setLoading(false);
    }
  };

  const showVectorSettings = settings.outputType === 'vector';
  const showOutlineSettings = settings.outputType === 'outline';
  const showEnhanceSettings = settings.outputType === 'enhance'; // 👈 Added flag

  return (
    <aside className="side">
      <div className="section">
        <h3 style={{ margin: '4px 0 12px 0' }}>Conversion Settings</h3>

        <div className="kv">
          <span className="badge">Output Type</span>
        </div>

        <div className="group" style={{ marginTop: 8 }}>
          {['vector', 'outline', 'enhance'].map(k => (
            <button
              key={k}
              className={`btn btn-ghost ${settings.outputType === k ? 'active' : ''}`}
              onClick={() => set('outputType', k)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* --- Vector Mode Settings --- */}
      {showVectorSettings && (
        <>
          <div className="section">
            <div className="kv"><span className="badge">Quality Level</span></div>
            <div className="group" style={{ marginTop: 8 }}>
              {['fast', 'balanced', 'high'].map(k => (
                <button
                  key={k}
                  className={`btn btn-ghost ${settings.quality === k ? 'active' : ''}`}
                  onClick={() => set('quality', k)}
                >
                  {k === 'high' ? 'High Quality' : k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="kv">
              <span className="badge">Detail Level</span>
              <span>{settings.detail}%</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0"
              max="100"
              step="1"
              value={settings.detail}
              onChange={e => set('detail', Number(e.target.value))}
            />
          </div>

          <div className="section">
            <div className="kv"><span className="badge">Color Reduction</span></div>
            <div className="group" style={{ marginTop: 8 }}>
              {['none', 'auto', 'aggressive'].map(k => (
                <button
                  key={k}
                  className={`btn btn-ghost ${settings.colorReduction === k ? 'active' : ''}`}
                  onClick={() => set('colorReduction', k)}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
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
            />
          </div>
        </>
      )}

      {/* --- Enhance Mode Info --- */}
      {showEnhanceSettings && (
        <div className="section">
          {/* <p style={{ fontSize: 14, color: '#666' }}>
            This mode uses Real-ESRGAN to upscale your image and enhance clarity.
          </p> */}
        </div>
      )}

      <div className="hr" />

      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={!canConvert || loading || !file}
        onClick={handleConvert}
      >
        {loading ? 'Converting…' : '🚀 Convert'}
      </button>
    </aside>
  );
}
