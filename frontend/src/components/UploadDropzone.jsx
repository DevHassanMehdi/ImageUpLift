import { useRef, useState } from 'react';

export default function UploadDropzone({ onSelect }){
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onFiles = files => {
    if(!files || !files[0]) return;
    const file = files[0];
    if(!/image\/(png|jpe?g|webp)/i.test(file.type)){
      alert('Please upload an image (png, jpg, jpeg, webp).');
      return;
    }
    onSelect(file);
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
      <div style={{fontSize:48,opacity:.35}}>📁</div>
      <h3>Drop your image here or click to upload</h3>
      <p>Supports PNG, JPG, JPEG, WEBP (Max ~10MB)</p>
    </div>
  );
}
