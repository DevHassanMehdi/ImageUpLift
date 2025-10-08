export default function SettingsPanel({
    settings, setSettings, canConvert, onConvert, loading
  }){
    const set = (k,v)=>setSettings({...settings,[k]:v});
  
    return (
      <aside className="side">
        <div className="section">
          <h3 style={{margin:'4px 0 12px 0'}}>Conversion Settings</h3>
          <div className="kv">
            <span className="badge">Output Type</span>
          </div>
          <div className="group" style={{marginTop:8}}>
            {['vector','outline','stencil'].map(k => (
              <button
                key={k}
                className={`btn btn-ghost ${settings.outputType===k?'active':''}`}
                onClick={()=>set('outputType',k)}
              >
                {k[0].toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
        </div>
  
        <div className="section">
          <div className="kv"><span className="badge">Quality Level</span></div>
          <div className="group" style={{marginTop:8}}>
            {['fast','balanced','high'].map(k => (
              <button
                key={k}
                className={`btn btn-ghost ${settings.quality===k?'active':''}`}
                onClick={()=>set('quality',k)}
              >
                {k==='high'?'High Quality':k[0].toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
        </div>
  
        <div className="section">
          <div className="kv"><span className="badge">Detail Level</span><span>{settings.detail}%</span></div>
          <input
            type="range" className="slider" min="0" max="100" step="1"
            value={settings.detail}
            onChange={e=>set('detail', Number(e.target.value))}
          />
        </div>
  
        <div className="section">
          <div className="kv"><span className="badge">Color Reduction</span></div>
          <div className="group" style={{marginTop:8}}>
            {['none','auto','aggressive'].map(k => (
              <button
                key={k}
                className={`btn btn-ghost ${settings.colorReduction===k?'active':''}`}
                onClick={()=>set('colorReduction',k)}
              >
                {k[0].toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
        </div>
  
        <div className="hr" />
  
        <button
          className="btn btn-primary"
          style={{width:'100%'}}
          disabled={!canConvert || loading}
          onClick={onConvert}
        >
          {loading ? 'Converting…' : '🚀 Convert to Vector'}
        </button>
      </aside>
    );
  }
  