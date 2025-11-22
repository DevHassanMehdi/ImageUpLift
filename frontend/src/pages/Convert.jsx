import { useEffect, useState } from 'react';
import UploadDropzone from '../components/UploadDropzone';
import PreviewPane from '../components/PreviewPane';
import SettingsPanel from '../components/SettingsPanel';
import StatsCard from '../components/StatsCard';
import ImageInsights from '../components/ImageInsights';
import Toasts from '../components/Toast';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

export default function Convert() {
  const [file, setFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState('');
  const [vectorSrc, setVectorSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [imagesConverted] = useState(0);
  const [lastTimeSec] = useState(0);
  const [outlineLow, setOutlineLow] = useState(100);
  const [outlineHigh, setOutlineHigh] = useState(200);
  const [metadata, setMetadata] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [settings, setSettings] = useState({
    outputType: 'vectorize',
    hierarchical: 'stacked',
    filterSpeckle: 8,
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
      setVectorSrc('');
      setOutlineLow(100);
      setOutlineHigh(200);
      setMetadata(null);
      setRecommendation(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Fetch recommendation when the file changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!file) return;
      setRecommending(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_BASE}/conversion/recommend`, {
          method: 'POST',
          mode: 'cors',
          body: fd,
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Recommend failed: ${res.status} ${errText}`);
        }
        const json = await res.json();
        if (cancelled) return;

        const rec = json.recommendation || {};
        const vectorize = rec.vector_settings || {};
        const outline = rec.outline_settings || {};
        const nextOutput = rec.conversion_mode || settings.outputType;
        setMetadata(json.metadata || null);
        setRecommendation(rec || null);
        addToast('Settings updated from analysis', 'success', 2000);

        setSettings(prev => ({
          ...prev,
          outputType: nextOutput,
          hierarchical: vectorize.hierarchical ?? prev.hierarchical,
          filterSpeckle: Number(vectorize.filter_speckle ?? prev.filterSpeckle),
          colorPrecision: Number(vectorize.color_precision ?? prev.colorPrecision),
          gradientStep: Number(vectorize.gradient_step ?? prev.gradientStep),
          preset: vectorize.preset ?? prev.preset ?? '',
          mode: vectorize.mode ?? prev.mode,
          cornerThreshold: Number(vectorize.corner_threshold ?? prev.cornerThreshold),
          segmentLength: Number(vectorize.segment_length ?? prev.segmentLength),
          spliceThreshold: Number(vectorize.splice_threshold ?? prev.spliceThreshold)
        }));

        if (outline.low !== undefined) setOutlineLow(Number(outline.low));
        if (outline.high !== undefined) setOutlineHigh(Number(outline.high));
      } catch (err) {
        console.error('Recommend request failed:', err);
        addToast('Failed to fetch recommendation', 'error');
      } finally {
        if (!cancelled) setRecommending(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const canConvert = !!file && !loading && !recommending;

  // �o. Clears both previews and resets file
  const handleClear = () => {
    setFile(null);
    setOriginalSrc('');
    setVectorSrc('');
    setMetadata(null);
    setRecommendation(null);
    addToast('Cleared image and previews', 'info', 1800);
  };

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
            onClear={handleClear} // �o. pass clear function to PreviewPane
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
          recommending={recommending}
          outlineLow={outlineLow}
          outlineHigh={outlineHigh}
          setOutlineLow={setOutlineLow}
          setOutlineHigh={setOutlineHigh}
          notify={addToast}
        />
        <StatsCard count={imagesConverted} lastTimeSec={lastTimeSec} />
        <ImageInsights metadata={metadata} recommendation={recommendation} />
      </div>
      <Toasts toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
