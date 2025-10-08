export default function PreviewPane({ originalSrc, vectorSrc, processing }){
    return (
      <div className="preview-grid">
        <div className="card" style={{padding:12, position:"relative"}}>
          <div className="label">Original Image</div>
          <div className="preview">
            {originalSrc ? <img src={originalSrc} alt="original" /> : <span>No image selected</span>}
          </div>
        </div>
        <div className="card" style={{padding:12, position:"relative"}}>
          <div className="label">Vector Output</div>
          <div className="preview">
            {processing && <span>Processing...</span>}
            {!processing && vectorSrc && (vectorSrc.endsWith('.svg') ? (
              <iframe title="vector" src={vectorSrc} style={{width:'100%',height:'100%',border:'none'}}/>
            ) : vectorSrc ? (
              <img src={vectorSrc} alt="vector-output" />
            ) : <span>Nothing yet – click Convert</span>)}
          </div>
        </div>
      </div>
    );
  }
  