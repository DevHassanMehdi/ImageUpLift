import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

const DEFAULT_SUMMARY = {
  total_images: 0,
  most_used_mode: "—",
  avg_processing_time: 0,
  common_image_type: "—",
};

const DEFAULT_MODE_USAGE = { vectorize: 1, outline: 1, enhance: 1 };
const DEFAULT_DAILY = [
  { date: "2025-11-20", count: 1 },
  { date: "2025-11-21", count: 2 },
  { date: "2025-11-22", count: 3 },
];
const DEFAULT_TIME_BY_MODE = [
  { mode: "vectorize", avg_time: 1.2 },
  { mode: "outline", avg_time: 0.8 },
  { mode: "enhance", avg_time: 5.5 },
];
const DEFAULT_PEAK = [
  { hour: "09", count: 1 },
  { hour: "14", count: 2 },
  { hour: "20", count: 1 },
];

export default function Analytics() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [modeUsage, setModeUsage] = useState(DEFAULT_MODE_USAGE);
  const [dailyTrend, setDailyTrend] = useState(DEFAULT_DAILY);
  const [timeByMode, setTimeByMode] = useState(DEFAULT_TIME_BY_MODE);
  const [peakHours, setPeakHours] = useState(DEFAULT_PEAK);
  const [contentTypes, setContentTypes] = useState([]);
  const [outputSizes, setOutputSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";
    Promise.all([
      fetch(`${API_BASE}/analytics/summary`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/mode-usage`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/daily-trend`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/time-by-mode`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/peak-hours`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/content-types`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/output-size-by-mode`).then((r) => r.json()),
    ])
      .then(([s, mu, dt, tbm, ph, ct, os]) => {
        setSummary(s || DEFAULT_SUMMARY);
        setModeUsage(mu || DEFAULT_MODE_USAGE);
        setDailyTrend(dt || DEFAULT_DAILY);
        setTimeByMode(tbm || DEFAULT_TIME_BY_MODE);
        setPeakHours(ph || DEFAULT_PEAK);
        setContentTypes(ct || []);
        setOutputSizes(os || []);
        setError("");
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        setError("Live analytics unavailable. Showing placeholders.");
      })
      .finally(() => setLoading(false));
  }, []);

  const modeData = Object.entries(modeUsage).map(([name, value]) => ({ name, value }));
  const timeModeData = timeByMode.map((i) => ({ name: i.mode, value: i.avg_time }));
  const peakHourData = peakHours.map((i) => ({ name: i.hour, value: i.count }));
  const contentTypeData = contentTypes.map((i) => ({ name: i.type, value: i.count, top_mode: i.top_mode }));
  const outputSizeData = outputSizes.map((i) => ({ name: i.mode, value: i.avg_size }));

  const COLORS = ["#4b8df8", "#34c9a3", "#845ec2"];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>Analytics Dashboard</h1>
      {loading && <p className="muted" style={{ marginTop: 0 }}>Loading live data...</p>}
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <SummaryCard title="Total Images" value={summary.total_images} />
        <SummaryCard title="Most Used Mode" value={summary.most_used_mode} />
        <SummaryCard title="Avg Processing Time" value={`${summary.avg_processing_time}s`} />
        <SummaryCard title="Most Common Type" value={summary.common_image_type} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        <ChartBox title="Mode Usage">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={modeData} outerRadius={70} dataKey="value" label>
                {modeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Time by Mode">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={timeModeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barCategoryGap={20}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{ value: "Seconds", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#666" } }}
              />
              <Tooltip />
              <Bar dataKey="value" barSize={40} radius={[6, 6, 0, 0]}>
                {timeModeData.map((entry, i) => {
                  const m = (entry.name || "").toLowerCase();
                  const color = m === "enhance" ? "#4b8df8" : m === "outline" ? "#34c9a3" : "#845ec2";
                  return <Cell key={`cell-time-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Avg Output Size by Mode (MB)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={outputSizeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {outputSizeData.map((entry, i) => {
                  const m = (entry.name || "").toLowerCase();
                  const color = m === "enhance" ? "#4b8df8" : m === "outline" ? "#34c9a3" : "#845ec2";
                  return <Cell key={`cell-size-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Content Types (AI)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contentTypeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {contentTypeData.map((_, i) => (
                  <Cell key={`cell-ctype-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 20,
        }}
      >
        <ChartBox title="Daily Trend">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax + 1"]}
                label={{ value: "Conversions", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#666" } }}
              />
              <Tooltip />
              <Line dataKey="count" stroke="#4b8df8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Peak Hours">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakHourData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                label={{ value: "Hour of day", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "#666" } }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                label={{ value: "Conversions", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#666" } }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#ff6b6b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        padding: 16,
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      <p style={{ fontSize: 13, marginBottom: 6, color: "#666" }}>{title}</p>
      <h3 style={{ margin: 0 }}>{value}</h3>
    </div>
  );
}

function ChartBox({ title, children, width }) {
  return (
    <div
      style={{
        width: width || "100%",
        background: "white",
        padding: 16,
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{ marginBottom: 10, fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}
