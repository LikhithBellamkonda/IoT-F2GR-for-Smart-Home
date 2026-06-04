import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardStore } from "../../store/dashboardStore";
import { HistoryPoint } from "../../types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── range selector ────────────────────────────────────────────────────────────

function RangeSelector() {
  const { historyRange, setHistoryRange } = useDashboardStore();
  const options = [
    { value: "24h", label: "24 h" },
    { value: "7d", label: "7 d" },
    { value: "30d", label: "30 d" },
  ] as const;

  return (
    <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setHistoryRange(o.value)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
            historyRange === o.value
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── single chart card ─────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  unit: string;
  data: HistoryPoint[];
  color: string;
  domain?: [number | "auto", number | "auto"];
  tickCount?: number;
  historyRange: string;
}

const tooltipStyle = {
  contentStyle: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    fontSize: "11px",
    color: "#e2e8f0",
  },
  itemStyle: { color: "#e2e8f0" },
};

function ChartCard({
  title,
  unit,
  data,
  color,
  domain = ["auto", "auto"],
  tickCount = 4,
  historyRange,
}: ChartCardProps) {
  const isEmpty = data.length === 0;
  const fmt = historyRange === "24h" ? fmtTime : fmtDate;

  // Recharts needs plain objects; data is already {ts, value}
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-slate-400 font-mono">{unit}</span>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
          No data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="ts"
              tickFormatter={fmt}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={domain}
              tickCount={tickCount}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              labelFormatter={(v) => fmt(v as number)}
              formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, title]}
              {...tooltipStyle}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export function Charts() {
  const { history, historyRange, isLoadingHistory } = useDashboardStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Historical Trends
        </h2>
        <div className="flex items-center gap-3">
          {isLoadingHistory && (
            <span className="text-xs text-slate-500 animate-pulse">Loading…</span>
          )}
          <RangeSelector />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Temperature"
          unit="°C"
          data={history.temperatures}
          color="#f59e0b"
          domain={[10, 50]}
          historyRange={historyRange}
        />
        <ChartCard
          title="Humidity"
          unit="%"
          data={history.humidities}
          color="#38bdf8"
          domain={[0, 100]}
          historyRange={historyRange}
        />
        <ChartCard
          title="Gas Level"
          unit="ppm"
          data={history.gases}
          color="#a78bfa"
          domain={[0, "auto"]}
          historyRange={historyRange}
        />
        <ChartCard
          title="Risk Score"
          unit=""
          data={history.risks}
          color="#f87171"
          domain={[0, 1]}
          tickCount={5}
          historyRange={historyRange}
        />
      </div>
    </div>
  );
}
