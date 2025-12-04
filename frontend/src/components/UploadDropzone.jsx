import { useRef, useState } from 'react';

const MAX_PIXELS = 1024 * 1024; // 1,048,576 pixels (~1024x1024)

export default function UploadDropzone({ onSelect }){
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const validateDimensions = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const totalPixels = img.width * img.height;
        if (totalPixels > MAX_PIXELS) {
          reject({ width: img.width, height: img.height, totalPixels });
        } else {
          resolve();
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to read image."));
      };
      img.src = url;
    });

  const onFiles = async files => {
    if(!files || !files[0]) return;
    const file = files[0];
    if(!/image\/(png|jpe?g|webp)/i.test(file.type)){
      setError('Please upload an image (png, jpg, jpeg, webp).');
      return;
    }
    try {
      await validateDimensions(file);
      setError('');
      onSelect(file);
    } catch (err) {
      if (err?.width && err?.height) {
        setError(`Image too large (${err.width}x${err.height}). Limit is ${MAX_PIXELS.toLocaleString()} pixels (~1024x1024).`);
      } else {
        setError(err.message || 'Unable to process image.');
      }
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
      <p>Supports PNG, JPG, JPEG, WEBP (Max ~1MP)</p>
      {error && <p className="muted" style={{ color: '#e11d48', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
