import { useRef, useState } from 'react';

const TARGET_PIXELS = 1024 * 1024; // ~1MP target footprint

export default function UploadDropzone({ onSelect }){
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const normalizeImage = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const totalPixels = img.width * img.height;
        if (totalPixels <= TARGET_PIXELS) {
          resolve({ file, resized: false });
          return;
        }
        const scale = Math.sqrt(TARGET_PIXELS / totalPixels);
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to process image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image.'));
              return;
            }
            const name = file.name.replace(/\.[^/.]+$/, '') || 'upload';
            const processed = new File([blob], `${name}_optimized.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve({
              file: processed,
              resized: true,
              original: { width: img.width, height: img.height },
              resizedDims: { width: targetWidth, height: targetHeight },
            });
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to read image.'));
      };
      img.src = url;
    });

  const onFiles = async files => {
    if(!files || !files[0]) return;
    const file = files[0];
    if(!/image\/(png|jpe?g|webp)/i.test(file.type)){
      setError('Please upload an image (png, jpg, jpeg, webp).');
      setError('Please upload an image (png, jpg, jpeg, webp).');
      return;
    }
    try {
      const result = await normalizeImage(file);
      setError('');
      if (result.resized) {
        setStatus(
          `Large photo compressed from ${result.original.width}×${result.original.height} to ${result.resizedDims.width}×${result.resizedDims.height}.`
        );
      } else {
        setStatus('');
      }
      onSelect(result.file);
    } catch (err) {
      setStatus('');
      setError(err.message || 'Unable to process image.');
    }
  };

  return (
    <div
      className={`drop ${dragOver ? 'dragover':''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => {e.preventDefault(); setDragOver(true);}}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files);}}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        hidden
        onChange={e => onFiles(e.target.files)}
      />
      <div style={{fontSize:36,opacity:.35}}>📁</div>
      <h3>Drop your image here or click to upload</h3>
      <p>Supports PNG, JPG, JPEG, WEBP (auto-compresses large photos)</p>
      {error && <p className="muted" style={{ color: '#e11d48', marginTop: 8 }}>{error}</p>}
      {!error && status && <p className="muted" style={{ color: '#0f766e', marginTop: 8 }}>{status}</p>}
    </div>
  );
}
