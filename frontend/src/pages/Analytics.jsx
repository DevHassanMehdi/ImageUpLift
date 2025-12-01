import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [modeUsage, setModeUsage] = useState(null);
  const [dailyTrend, setDailyTrend] = useState(null);
  const [imageTypes, setImageTypes] = useState(null);
  const [timeByMode, setTimeByMode] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [fastest, setFastest] = useState(null);
  const [slowest, setSlowest] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:5001/analytics/summary").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/mode-usage").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/daily-trend").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/image-types").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/time-by-mode").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/peak-hours").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/fastest").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/slowest").then((r) => r.json()),
      fetch("http://localhost:5001/analytics/recent").then((r) => r.json()),
    ])
      .then(([s, mu, dt, it, tbm, ph, fa, sl, rc]) => {
        setSummary(s);
        setModeUsage(mu);
        setDailyTrend(dt);
        setImageTypes(it);
        setTimeByMode(tbm);
        setPeakHours(ph);
        setFastest(fa);
        setSlowest(sl);
        setRecent(rc);
      })
      .catch((err) => console.error("Analytics fetch error:", err));
  }, []);

  if (
    !summary ||
    !modeUsage ||
    !dailyTrend ||
    !imageTypes ||
    !timeByMode ||
    !peakHours ||
    !fastest ||
    !slowest ||
    !recent
  ) {
    return <p style={{ padding: 20 }}>Loading analytics...</p>;
  }

  /* ---------------- DATA FORMAT ---------------- */
  const modeData = Object.entries(modeUsage).map(([name, value]) => ({
    name,
    value,
  }));
  const typeData = imageTypes.map((i) => ({ name: i.type, value: i.count }));
  const timeModeData = timeByMode.map((i) => ({
    name: i.mode,
    value: i.avg_time,
  }));
  const peakHourData = peakHours.map((i) => ({
    name: i.hour,
    value: i.count,
  }));

  // For pies: enhance, outline, vectorize → blue, teal, purple
  const COLORS = ["#4b8df8", "#34c9a3", "#845ec2"];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 30 }}>Analytics Dashboard</h1>

      {/* ---------------- SUMMARY CARDS ---------------- */}
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
        <SummaryCard
          title="Avg Processing Time"
          value={summary.avg_processing_time + "s"}
        />
        <SummaryCard title="Most Common Type" value={summary.common_image_type} />
      </div>

      {/* ---------------- FIVE CHARTS IN A ROW ---------------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {/* PIE 1 - Mode Usage */}
        <ChartBox title="Mode Usage" width={220}>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={modeData} outerRadius={60} dataKey="value" label>
                {modeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* PIE 2 - Image Type */}
        <ChartBox title="Image Types" width={220}>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={typeData} outerRadius={60} dataKey="value" label>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* LINE - Daily Trend */}
        <ChartBox title="Daily Trend" width={220}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax + 1"]}
                label={{
                  value: "Conversions",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#666" },
                }}
              />
              <Tooltip />
              <Line dataKey="count" stroke="#4b8df8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* BAR 1 - Time by Mode */}
        <ChartBox title="Time by Mode" width={220}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={timeModeData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              barCategoryGap={20}
            >
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{
                  value: "Seconds",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#666" },
                }}
              />
              <Tooltip />
              <Bar dataKey="value" barSize={40} radius={[6, 6, 0, 0]}> 
                {timeModeData.map((entry, i) => {
                  const m = (entry.name || "").toLowerCase();
                  const color =
                    m === "enhance"
                      ? "#4b8df8"
                      : m === "outline"
                      ? "#34c9a3"
                      : "#845ec2";
                  return <Cell key={`cell-time-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* BAR 2 - Peak Hours */}
        <ChartBox title="Peak Hours" width={220}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={peakHourData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                label={{
                  value: "Hour of day",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 11, fill: "#666" },
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                label={{
                  value: "Conversions",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#666" },
                }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#ff6b6b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* ---------------- THREE TABLES ---------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
        }}
      >
        <ChartBox title="Fastest">
          <Table list={fastest} />
        </ChartBox>

        <ChartBox title="Slowest">
          <Table list={slowest} />
        </ChartBox>

        <ChartBox title="Recent">
          <Table list={recent} />
        </ChartBox>
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

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

function Table({ list }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
      }}
    >
      <thead style={{ background: "#f3f3f3" }}>
        <tr>
          <th style={th}>Image</th>
          <th style={th}>Mode</th>
          <th style={th}>Time</th>
          <th style={th}>Date</th>
        </tr>
      </thead>
      <tbody>
        {list.map((item, i) => (
          <tr key={i}>
            <td style={td}>{item.image_name || "--"}</td>
            <td style={td}>{item.mode || "--"}</td>
            <td style={td}>
              {item.time
                ? item.time.toFixed(2) + "s"
                : item.time_taken
                ? item.time_taken.toFixed(2) + "s"
                : "--"}
            </td>
            <td style={td}>{item.timestamp?.split("T")[0] || "--"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = {
  padding: 8,
  textAlign: "left",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: 8,
  borderBottom: "1px solid #eee",
};
