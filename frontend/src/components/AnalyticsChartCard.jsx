export default function AnalyticsChartCard({ title, children }) {
  return (
    <div className="card chart-card">
      <h3 className="chart-card__title">{title}</h3>
      {children}
    </div>
  );
}
