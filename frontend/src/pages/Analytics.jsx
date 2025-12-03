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
import AnalyticsSummaryCard from "../components/AnalyticsSummaryCard";
import AnalyticsChartCard from "../components/AnalyticsChartCard";

const DEFAULT_SUMMARY = {
  total_images: 0,
  most_used_mode: "--",
  avg_processing_time: 0,
  common_image_type: "--",
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
      fetch(`${API_BASE}/analytics/output-size-by-mode`).then((r) => r.json()),
      fetch(`${API_BASE}/analytics/image-types`).then((r) => r.json()),
    ])
      .then(([s, mu, dt, tbm, ph, os, ct]) => {
        setSummary(s && Object.keys(s).length ? s : DEFAULT_SUMMARY);
        setModeUsage(mu && Object.keys(mu).length ? mu : DEFAULT_MODE_USAGE);
        setDailyTrend(Array.isArray(dt) && dt.length ? dt : DEFAULT_DAILY);
        setTimeByMode(Array.isArray(tbm) && tbm.length ? tbm : DEFAULT_TIME_BY_MODE);
        setPeakHours(Array.isArray(ph) && ph.length ? ph : DEFAULT_PEAK);
        setOutputSizes(Array.isArray(os) && os.length ? os : DEFAULT_TIME_BY_MODE.map(m => ({ mode: m.mode, avg_size: 0.05 })));
        setContentTypes(Array.isArray(ct) && ct.length ? ct : [{ type: "graphic", count: 2 }, { type: "photo", count: 1 }]);
        setError("");
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        // keep placeholders visible
        setSummary(DEFAULT_SUMMARY);
        setModeUsage(DEFAULT_MODE_USAGE);
        setDailyTrend(DEFAULT_DAILY);
        setTimeByMode(DEFAULT_TIME_BY_MODE);
        setPeakHours(DEFAULT_PEAK);
        setOutputSizes(DEFAULT_TIME_BY_MODE.map(m => ({ mode: m.mode, avg_size: 0.05 })));
        setContentTypes([{ type: "graphic", count: 2 }, { type: "photo", count: 1 }]);
        setError("Live analytics unavailable. Showing placeholders.");
      })
      .finally(() => setLoading(false));
  }, []);

  const modeData = Object.entries(modeUsage).map(([name, value]) => ({ name, value }));
  const timeModeData = timeByMode.map((i) => ({ name: i.mode, value: i.avg_time }));
  const peakHourData = peakHours.map((i) => ({ name: i.hour, value: i.count }));
  const contentTypeData = contentTypes.map((i) => ({ name: i.type, value: i.count }));
  const outputSizeData = outputSizes.map((i) => ({ name: i.mode, value: i.avg_size }));

  const COLORS = ["#4b8df8", "#34c9a3", "#845ec2"];
  const ANIM_DURATION = 1000; // slightly quicker animations (~0.5s faster)

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Analytics Dashboard</h1>
          {loading && <p className="muted analytics-muted">Loading live data...</p>}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
      </div>

      <div className="analytics-summary-grid">
        <AnalyticsSummaryCard title="Total Images" value={summary.total_images} />
        <AnalyticsSummaryCard title="Most Used Mode" value={summary.most_used_mode} />
        <AnalyticsSummaryCard title="Avg Processing Time" value={`${summary.avg_processing_time}s`} />
        <AnalyticsSummaryCard title="Most Common Type" value={summary.common_image_type} />
      </div>

      <div className="analytics-chart-grid">
        <AnalyticsChartCard title="Mode Usage">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={modeData} outerRadius={70} dataKey="value" label animationDuration={ANIM_DURATION}>
                {modeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Time by Mode">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={timeModeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barCategoryGap={20}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{ value: "Seconds", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#666" } }}
              />
              <Tooltip />
              <Bar dataKey="value" barSize={40} radius={[6, 6, 0, 0]} animationDuration={ANIM_DURATION}>
                {timeModeData.map((entry, i) => {
                  const m = (entry.name || "").toLowerCase();
                  const color = m === "enhance" ? "#4b8df8" : m === "outline" ? "#34c9a3" : "#845ec2";
                  return <Cell key={`cell-time-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Avg Output Size by Mode (MB)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={outputSizeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={ANIM_DURATION}>
                {outputSizeData.map((entry, i) => {
                  const m = (entry.name || "").toLowerCase();
                  const color = m === "enhance" ? "#4b8df8" : m === "outline" ? "#34c9a3" : "#845ec2";
                  return <Cell key={`cell-size-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Content Types (AI)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contentTypeData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={ANIM_DURATION}>
                {contentTypeData.map((_, i) => (
                  <Cell key={`cell-ctype-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <div className="analytics-trend-grid">
        <AnalyticsChartCard title="Daily Trend">
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
              <Line dataKey="count" stroke="#ff6b6b" strokeWidth={2} animationDuration={ANIM_DURATION} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Peak Hours">
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
              <Bar dataKey="value" fill="#ff6b6b" radius={[6, 6, 0, 0]} animationDuration={ANIM_DURATION} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
