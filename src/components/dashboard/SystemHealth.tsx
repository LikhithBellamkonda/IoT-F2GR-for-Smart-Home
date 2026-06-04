import { Wifi, WifiOff, Clock, Zap, Timer } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatLastUpdate(ts: number): string {
  if (!ts) return "—";
  const diffMs = Date.now() - ts;
  if (diffMs < 1000) return "just now";
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export function SystemHealth() {
  const { health } = useDashboardStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-3">
      {/* MQTT connection */}
      <div className="flex items-center gap-2.5">
        {health.mqtt_connected ? (
          <Wifi className="w-4 h-4 text-emerald-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
        )}
        <span
          className={`text-sm font-semibold ${
            health.mqtt_connected ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          MQTT {health.mqtt_connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="w-px h-4 bg-slate-700 hidden sm:block" />

      {/* Packet rate */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-sky-400" />
        <span className="text-xs text-slate-400">Packet rate</span>
        <span className="text-sm font-semibold text-white tabular-nums">
          {health.packet_rate.toFixed(1)}{" "}
          <span className="text-slate-500 font-normal">pkt/s</span>
        </span>
      </div>

      <div className="w-px h-4 bg-slate-700 hidden sm:block" />

      {/* Last update */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">Last update</span>
        <span className="text-sm font-semibold text-white tabular-nums">
          {formatLastUpdate(health.last_update)}
        </span>
      </div>

      <div className="w-px h-4 bg-slate-700 hidden sm:block" />

      {/* Uptime */}
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">Uptime</span>
        <span className="text-sm font-semibold text-white tabular-nums">
          {formatUptime(health.uptime_seconds)}
        </span>
      </div>
    </div>
  );
}
