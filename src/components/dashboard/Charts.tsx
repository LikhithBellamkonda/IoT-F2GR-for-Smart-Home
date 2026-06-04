import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useDashboardStore } from "../../store/dashboardStore";
import { HistoryPoint } from "../../types";

function fmtTime(ts: number) { return new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }

function RangeSelector() {
  const { historyRange, setHistoryRange } = useDashboardStore();
  const opts = [{ v:"24h",l:"24 h" },{ v:"7d",l:"7 d" },{ v:"30d",l:"30 d" }] as const;
  return (
    <div className="range-pill">
      {opts.map(o => (
        <motion.button
          key={o.v} whileTap={{ scale:0.94 }}
          onClick={() => setHistoryRange(o.v)}
          className={historyRange===o.v ? "active" : ""}
        >{o.l}</motion.button>
      ))}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background:"rgba(255,255,255,0.80)", border:"1px solid rgba(255,255,255,0.70)",
    borderRadius:"14px", fontSize:"12px", fontFamily:"Inter,sans-serif",
    color:"#0f2027", backdropFilter:"blur(16px)",
    boxShadow:"0 4px 20px rgba(13,148,136,0.12)",
  },
  itemStyle:  { color:"#1e4a5a" },
  labelStyle: { color:"#5a8fa0", fontFamily:"Inter,sans-serif", fontSize:"11px" },
};

interface ChartCardProps {
  title: string; unit: string; data: HistoryPoint[]; color: string;
  domain?: [number|"auto", number|"auto"]; tickCount?: number; historyRange: string;
}

function ChartCard({ title, unit, data, color, domain=["auto","auto"], tickCount=4, historyRange }: ChartCardProps) {
  const fmt = historyRange==="24h" ? fmtTime : fmtDate;
  return (
    <motion.div
      className="glass-card"
      whileHover={{ scale:1.015 }}
      transition={{ type:"spring", stiffness:300, damping:28 }}
      style={{ padding:"1.1rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"var(--font)", fontSize:"1rem", fontWeight:700, color:"var(--text-primary)" }}>{title}</span>
        <span style={{ fontFamily:"var(--font)", fontSize:"0.72rem", color:"var(--text-muted)" }}>{unit}</span>
      </div>
      {data.length===0
        ? <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:140,
            fontFamily:"var(--font)",fontSize:"0.85rem",color:"var(--text-muted)" }}>No data yet</div>
        : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top:4,right:8,bottom:0,left:-8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.30)" />
              <XAxis dataKey="ts" tickFormatter={fmt}
                tick={{ fill:"#5a8fa0",fontSize:10,fontFamily:"Inter,sans-serif" }}
                tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis domain={domain} tickCount={tickCount}
                tick={{ fill:"#5a8fa0",fontSize:10,fontFamily:"Inter,sans-serif" }}
                tickLine={false} axisLine={false} width={36} />
              <Tooltip labelFormatter={v=>fmt(v as number)}
                formatter={(v:number)=>[`${v.toFixed(2)} ${unit}`,title]}
                {...tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
                dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      }
    </motion.div>
  );
}

export function Charts() {
  const { history, historyRange, isLoadingHistory } = useDashboardStore();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontFamily:"var(--font)", fontSize:"1.25rem", fontWeight:800,
          color:"var(--text-primary)", margin:0 }}>Historical Trends</h2>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          {isLoadingHistory && (
            <motion.span animate={{ opacity:[1,0.4,1] }} transition={{ repeat:Infinity, duration:1.2 }}
              style={{ fontFamily:"var(--font)", fontSize:"0.75rem", color:"var(--text-muted)" }}>
              Loading…
            </motion.span>
          )}
          <RangeSelector />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(1,1fr)", gap:"1rem" }} className="chart-grid">
        <ChartCard title="Temperature" unit="°C" data={history.temperatures} color="#f59e0b" domain={[10,50]} historyRange={historyRange} />
        <ChartCard title="Humidity" unit="%" data={history.humidities} color="#38bdf8" domain={[0,100]} historyRange={historyRange} />
        <ChartCard title="Gas Level" unit="ppm" data={history.gases} color="#a78bfa" domain={[0,"auto"]} historyRange={historyRange} />
        <ChartCard title="Risk Score" unit="" data={history.risks} color="#f43f5e" domain={[0,1]} tickCount={5} historyRange={historyRange} />
      </div>
      <style>{`@media(min-width:768px){.chart-grid{grid-template-columns:repeat(2,1fr)!important;}}`}</style>
    </div>
  );
}
