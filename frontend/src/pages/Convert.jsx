import { useEffect, useState } from 'react';
import UploadDropzone from '../components/UploadDropzone';
import PreviewPane from '../components/PreviewPane';
import SettingsPanel from '../components/SettingsPanel';
import StatsCard from '../components/StatsCard';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

export default function Convert() {
  const [file, setFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState('');
  const [vectorSrc, setVectorSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagesConverted, setImagesConverted] = useState(0);
  const [lastTimeSec, setLastTimeSec] = useState(0);

  const [settings, setSettings] = useState({
    outputType: 'vector',
    hierarchical: 'stacked',
    filterSpeckle: 16,
    colorPrecision: 6,
    gradientStep: 60,
    preset: '',
    mode: 'spline',
    cornerThreshold: 40,
    segmentLength: 10,
    spliceThreshold: 80
  });
  

  // Generate local preview for the uploaded file
  useEffect(() => {
    if (!file) {
      setOriginalSrc('');
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canConvert = !!file && !loading;

  // ✅ Clears both previews and resets file
  const handleClear = () => {
    setFile(null);
    setOriginalSrc('');
    setVectorSrc('');
  };

  return (
    <div className="grid">
      {/* Left: upload + previews */}
      <div>
        <div className="panel card">
          <UploadDropzone onSelect={setFile} />
        </div>

        <div style={{ marginTop: 16 }}>
          <PreviewPane
            originalSrc={originalSrc}
            vectorSrc={vectorSrc}
            processing={loading}
            onClear={handleClear} // ✅ pass clear function to PreviewPane
          />
        </div>
      </div>

      {/* Right: settings + stats */}
      <div>
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          canConvert={canConvert}
          loading={loading}
          setLoading={setLoading}
          file={file}
          setVectorSrc={setVectorSrc}
        />
        <StatsCard count={imagesConverted} lastTimeSec={lastTimeSec} />
      </div>
    </div>
  );
}
