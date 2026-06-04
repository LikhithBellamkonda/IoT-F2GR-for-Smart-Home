import { motion } from "framer-motion";
import { Wifi, WifiOff, Clock, Zap, Timer } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";

function formatUptime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}
function formatLastUpdate(ts: number) {
  if (!ts) return "—";
  const d = Date.now() - ts;
  if (d < 1000) return "just now";
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      {icon}
      <span style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:"var(--font)" }}>{label}</span>
      <span style={{ fontFamily:"var(--font)", fontSize:"0.95rem", fontWeight:700,
        color:"var(--text-primary)", fontVariantNumeric:"tabular-nums" }}>{value}</span>
    </div>
  );
}

export function SystemHealth() {
  const { health } = useDashboardStore();

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
      style={{
        padding:"1rem 1.5rem",
        display:"flex", flexWrap:"wrap", alignItems:"center", gap:"1.5rem",
      }}
    >
      {/* MQTT */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        {health.mqtt_connected
          ? <Wifi className="w-4 h-4" style={{ color:"var(--teal-light)" }} />
          : <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.2 }}>
              <WifiOff className="w-4 h-4" style={{ color:"var(--rose)" }} />
            </motion.div>
        }
        <span style={{ fontFamily:"var(--font)", fontSize:"0.92rem", fontWeight:700,
          color: health.mqtt_connected ? "var(--teal-dark)" : "var(--rose)" }}>
          MQTT {health.mqtt_connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div style={{ width:1, height:20, background:"rgba(255,255,255,0.50)" }} className="sm-div" />

      <Stat
        icon={<Zap className="w-4 h-4" style={{ color:"var(--sky)" }} />}
        label="Packet rate"
        value={<>{health.packet_rate.toFixed(1)} <span style={{ fontWeight:400, fontSize:"0.75rem", color:"var(--text-muted)" }}>pkt/s</span></>}
      />
      <div style={{ width:1, height:20, background:"rgba(255,255,255,0.50)" }} className="sm-div" />
      <Stat
        icon={<Clock className="w-4 h-4" style={{ color:"var(--text-muted)" }} />}
        label="Last update"
        value={formatLastUpdate(health.last_update)}
      />
      <div style={{ width:1, height:20, background:"rgba(255,255,255,0.50)" }} className="sm-div" />
      <Stat
        icon={<Timer className="w-4 h-4" style={{ color:"var(--text-muted)" }} />}
        label="Uptime"
        value={formatUptime(health.uptime_seconds)}
      />

      <style>{`@media(max-width:639px){.sm-div{display:none}}`}</style>
    </motion.div>
  );
}
