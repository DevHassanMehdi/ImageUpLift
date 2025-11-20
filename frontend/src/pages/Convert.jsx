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
  const [recommending, setRecommending] = useState(false);
  const [imagesConverted, setImagesConverted] = useState(0);
  const [lastTimeSec, setLastTimeSec] = useState(0);
  const [outlineLow, setOutlineLow] = useState(100);
  const [outlineHigh, setOutlineHigh] = useState(200);

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
      setVectorSrc('');
      setOutlineLow(100);
      setOutlineHigh(200);
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
        const vector = rec.vector_settings || {};
        const outline = rec.outline_settings || {};
        const nextOutput = rec.conversion_mode || settings.outputType;

        setSettings(prev => ({
          ...prev,
          outputType: nextOutput,
          hierarchical: vector.hierarchical ?? prev.hierarchical,
          filterSpeckle: Number(vector.filter_speckle ?? prev.filterSpeckle),
          colorPrecision: Number(vector.color_precision ?? prev.colorPrecision),
          gradientStep: Number(vector.gradient_step ?? prev.gradientStep),
          preset: vector.preset ?? prev.preset ?? '',
          mode: vector.mode ?? prev.mode,
          cornerThreshold: Number(vector.corner_threshold ?? prev.cornerThreshold),
          segmentLength: Number(vector.segment_length ?? prev.segmentLength),
          spliceThreshold: Number(vector.splice_threshold ?? prev.spliceThreshold)
        }));

        if (outline.low !== undefined) setOutlineLow(Number(outline.low));
        if (outline.high !== undefined) setOutlineHigh(Number(outline.high));
      } catch (err) {
        console.error('Recommend request failed:', err);
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
        />
        <StatsCard count={imagesConverted} lastTimeSec={lastTimeSec} />
      </div>
    </div>
  );
}
