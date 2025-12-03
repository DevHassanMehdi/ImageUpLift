export default function AnalyticsSummaryCard({ title, value }) {
  return (
    <div className="card summary-card">
      <p className="summary-label">{title}</p>
      <h3 className="summary-value">{value}</h3>
    </div>
  );
}
