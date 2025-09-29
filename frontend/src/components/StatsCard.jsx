export default function StatsCard({ count, lastTimeSec }){
    return (
      <div className="card" style={{padding:16, marginTop:16}}>
        <h4 style={{marginTop:0}}>Your Stats</h4>
        <div className="stat">
          <span>Images Converted</span>
          <strong>{count}</strong>
        </div>
        <div className="stat">
          <span>Last Processing Time</span>
          <strong>{lastTimeSec ? `${lastTimeSec.toFixed(2)}s` : '—'}</strong>
        </div>
      </div>
    );
  }
  