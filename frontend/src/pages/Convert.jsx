import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UploadDropzone from '../components/UploadDropzone';
import PreviewPane from '../components/PreviewPane';
import SettingsPanel from '../components/SettingsPanel';
import ImageInsights from '../components/ImageInsights';
import Toasts from '../components/Toast';
import {
  getConvertCache,
  updateConvertCache,
  resetConvertCache,
  getDefaultSettings,
} from '../state/convertCache';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');

export default function Convert() {
  const initialCache = getConvertCache();
  const [searchParams, setSearchParams] = useSearchParams();
  const [file, setFile] = useState(initialCache.file || null);
  const [originalSrc, setOriginalSrc] = useState(initialCache.originalSrc || '');
  const [vectorSrc, setVectorSrc] = useState(initialCache.vectorSrc || '');
  const [loading, setLoading] = useState(Boolean(initialCache.isConverting));
  const [recommending, setRecommending] = useState(false);
  const [outlineLow, setOutlineLow] = useState(initialCache.outlineLow ?? 100);
  const [outlineHigh, setOutlineHigh] = useState(initialCache.outlineHigh ?? 200);
  const [metadata, setMetadata] = useState(initialCache.metadata ?? null);
  const [recommendation, setRecommendation] = useState(initialCache.recommendation ?? null);
  const [toasts, setToasts] = useState([]);
  const [loadedConversionId, setLoadedConversionId] = useState(initialCache.loadedConversionId);
  const [hasAnalyzed, setHasAnalyzed] = useState(Boolean(initialCache.hasAnalyzed));
  const [settings, setSettings] = useState(() => ({ ...(initialCache.settings || getDefaultSettings()) }));

  useEffect(() => {
    updateConvertCache({
      file,
      originalSrc,
      vectorSrc,
      outlineLow,
      outlineHigh,
      metadata,
      recommendation,
      loadedConversionId,
      settings,
      hasAnalyzed,
      isConverting: loading,
    });
  }, [
    file,
    originalSrc,
    vectorSrc,
    outlineLow,
    outlineHigh,
    metadata,
    recommendation,
    loadedConversionId,
    settings,
    hasAnalyzed,
    loading,
  ]);

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
      if (!file || hasAnalyzed) return;
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
        setHasAnalyzed(true);
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
  }, [file, hasAnalyzed]);

  const canConvert = !!file && !loading && !recommending;

  // Clears both previews and resets file
  const handleClear = () => {
    setFile(null);
    setOriginalSrc('');
    setVectorSrc('');
    setMetadata(null);
    setRecommendation(null);
    setLoadedConversionId(null);
    setHasAnalyzed(false);
    resetConvertCache();
    if (searchParams.has('conversionId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('conversionId');
      setSearchParams(next, { replace: true });
    }
    addToast('Cleared image and previews', 'info', 1800);
  };

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleFileSelect = (nextFile) => {
    setFile(nextFile);
    setHasAnalyzed(false);
  };

  // Load an existing conversion when navigated from Gallery
  useEffect(() => {
    const cid = searchParams.get('conversionId');
    if (!cid || cid === loadedConversionId) return;

    const fetchExisting = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/conversion/detail/${cid}`);
        if (!res.ok) {
          throw new Error(`Failed to load conversion ${cid}`);
        }
        const json = await res.json();
        let galleryFile = file;
        if (json.original_url) {
          const origUrl = `${API_BASE}${json.original_url}`;
          setOriginalSrc(origUrl);
          try {
            const blobRes = await fetch(origUrl);
            if (!blobRes.ok) {
              throw new Error(`Failed to fetch original blob for ${cid}`);
            }
            const blob = await blobRes.blob();
            const name = json.image_name || file?.name || 'gallery-image.png';
            galleryFile = new File([blob], name, { type: blob.type || 'application/octet-stream' });
            setFile(galleryFile);
          } catch (blobErr) {
            console.error('Failed to load original blob', blobErr);
            addToast('Original preview failed to load fully', 'error');
          }
        }
        if (json.output_url) {
          setVectorSrc(`${API_BASE}${json.output_url}`);
        }
        if (json.chosen_params) {
          const params = json.chosen_params;
          setSettings(prev => ({
            ...prev,
            outputType: params.outputType ?? prev.outputType,
            hierarchical: params.hierarchical ?? prev.hierarchical,
            filterSpeckle: Number(params.filter_speckle ?? prev.filterSpeckle),
            colorPrecision: Number(params.color_precision ?? prev.colorPrecision),
            gradientStep: Number(params.gradient_step ?? prev.gradientStep),
            preset: params.preset ?? prev.preset ?? '',
            mode: params.mode ?? prev.mode,
            cornerThreshold: Number(params.corner_threshold ?? prev.cornerThreshold),
            segmentLength: Number(params.segment_length ?? prev.segmentLength),
            spliceThreshold: Number(params.splice_threshold ?? prev.spliceThreshold)
          }));
          if (params.low !== undefined) setOutlineLow(Number(params.low));
          if (params.high !== undefined) setOutlineHigh(Number(params.high));
        }
        setLoadedConversionId(cid);
        setHasAnalyzed(Boolean(galleryFile));
        addToast('Loaded conversion from gallery', 'info', 2000);
      } catch (err) {
        console.error('Failed to load conversion', err);
        addToast('Could not load selected conversion', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="grid">
      {/* Left: upload + previews */}
      <div>
        <div className="panel card">
          <UploadDropzone onSelect={handleFileSelect} />
        </div>

        <div style={{ marginTop: 16 }}>
          <PreviewPane
            originalSrc={originalSrc}
            vectorSrc={vectorSrc}
            processing={loading}
            onClear={handleClear}
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
        <ImageInsights metadata={metadata} recommendation={recommendation} />
      </div>
      <Toasts toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
