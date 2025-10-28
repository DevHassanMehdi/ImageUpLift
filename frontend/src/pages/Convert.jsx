import { useEffect, useState } from 'react';
import UploadDropzone from '../components/UploadDropzone';
import PreviewPane from '../components/PreviewPane';
import SettingsPanel from '../components/SettingsPanel';
import StatsCard from '../components/StatsCard';

// const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const API_BASE = 'http://localhost:5001';



export default function Convert() {
  const [file, setFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState('');
  const [vectorSrc, setVectorSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagesConverted, setImagesConverted] = useState(0);
  const [lastTimeSec, setLastTimeSec] = useState(0);

  const [settings, setSettings] = useState({
    outputType: 'vector',    // 'vector' | 'outline' | 'Enhance'
    quality: 'balanced',     // 'fast' | 'balanced' | 'high'
    detail: 75,              // 0..100
    colorReduction: 'auto'   // 'none' | 'auto' | 'aggressive'
  });

  // 🔹 Show preview of uploaded file
  useEffect(() => {
    if (!file) {
      setOriginalSrc('');
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canConvert = !!file;

  // 🚀 Conversion handler — sends to FastAPI
  const convert = async () => {
    if (!file) return;
    setLoading(true);
    setVectorSrc('');
    const t0 = performance.now();

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('outputType', settings.outputType);
      fd.append('quality', settings.quality);
      fd.append('detail', settings.detail);
      fd.append('colorReduction', settings.colorReduction);

      const res = await fetch(`${API_BASE}/conversion/convert`, {
        method: 'POST',
        mode: 'cors',
        body: fd,
        headers: {
          // Let browser infer Content-Type for FormData
          'Accept': 'application/json, image/svg+xml, image/png',
          // Force CORS preflight by including custom header
          'X-Requested-With': 'XMLHttpRequest'
        },
      });
      
      

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Conversion failed: ${errorText}`);
      }

      // Handle responses based on outputType
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('image/svg+xml')) {
        // SVG response (Vector)
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setVectorSrc(url);
      } else if (contentType && contentType.includes('image/png')) {
        // PNG response (Enhance future)
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setVectorSrc(url);
      } else {
        // JSON or placeholder responses
        const json = await res.json();
        alert(json.message || 'Conversion successful (non-image response)');
      }

      setImagesConverted(c => c + 1);
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Conversion failed. Check console for details.');
    } finally {
      const t1 = performance.now();
      setLastTimeSec((t1 - t0) / 1000);
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      {/* 🧭 Left Panel — Upload + Previews */}
      <div>
        <div className="panel card">
          <UploadDropzone onSelect={setFile} />
        </div>

        <div style={{ marginTop: 16 }}>
          <PreviewPane
            originalSrc={originalSrc}
            vectorSrc={vectorSrc}
            processing={loading}
          />
        </div>
      </div>

      {/* ⚙️ Right Panel — Settings + Stats */}
      <div>
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          canConvert={canConvert}
          loading={loading}
          onConvert={convert}
          file={file}
          setVectorSrc={setVectorSrc}
        />
        <StatsCard count={imagesConverted} lastTimeSec={lastTimeSec} />
      </div>
    </div>
  );
}
