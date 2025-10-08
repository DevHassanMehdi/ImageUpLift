import { useEffect, useMemo, useState } from 'react';
import UploadDropzone from '../components/UploadDropzone';
import PreviewPane from '../components/PreviewPane';
import SettingsPanel from '../components/SettingsPanel';
import StatsCard from '../components/StatsCard';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export default function Convert(){
  const [file, setFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState('');
  const [vectorSrc, setVectorSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagesConverted, setImagesConverted] = useState(0);
  const [lastTimeSec, setLastTimeSec] = useState(0);

  const [settings, setSettings] = useState({
    outputType: 'vector',    // 'vector' | 'outline' | 'stencil'
    quality: 'balanced',     // 'fast' | 'balanced' | 'high'
    detail: 75,              // 0..100
    colorReduction: 'auto'   // 'none' | 'auto' | 'aggressive'
  });

  // generate local preview for the uploaded file
  useEffect(()=>{
    if(!file){ setOriginalSrc(''); return; }
    const url = URL.createObjectURL(file);
    setOriginalSrc(url);
    return () => URL.revokeObjectURL(url);
  },[file]);

  const canConvert = !!file;

  const convert = async () => {
    if(!file) return;
    setLoading(true);
    setVectorSrc('');
    const t0 = performance.now();

    try{
      // Build the payload for your backend
      const fd = new FormData();
      fd.append('file', file);
      fd.append('outputType', settings.outputType);
      fd.append('quality', settings.quality);
      fd.append('detail', String(settings.detail));
      fd.append('colorReduction', settings.colorReduction);

      // ---- Real backend call (uncomment when your API is ready) ----
      // const res = await fetch(`${API_BASE}/api/convert`, { method:'POST', body: fd });
      // if(!res.ok) throw new Error('Conversion failed');
      // const blob = await res.blob(); // e.g. an SVG
      // const outUrl = URL.createObjectURL(blob);
      // setVectorSrc(outUrl);

      // ---- Temporary mock so UI works today ----
      // (Pretend the output equals the original; replace with real API above)
      await new Promise(r => setTimeout(r, 1200));
      setVectorSrc(originalSrc);

      setImagesConverted(c => c + 1);
    }catch(err){
      console.error(err);
      alert('Conversion failed. Check console for details.');
    }finally{
      const t1 = performance.now();
      setLastTimeSec((t1 - t0)/1000);
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      {/* Left: upload + previews */}
      <div>
        <div className="panel card">
          <UploadDropzone onSelect={setFile} />
        </div>

        <div style={{marginTop:16}}>
          <PreviewPane
            originalSrc={originalSrc}
            vectorSrc={vectorSrc}
            processing={loading}
          />
        </div>
      </div>

      {/* Right: settings + stats */}
      <div>
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          canConvert={canConvert}
          onConvert={convert}
          loading={loading}
        />
        <StatsCard count={imagesConverted} lastTimeSec={lastTimeSec} />
      </div>
    </div>
  );
}
