import React from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Sun,
  Shield,
  Cpu,
  Bell,
} from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { FsmState } from "../../types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fsmColor(state: FsmState): string {
  switch (state) {
    case "IDLE":      return "text-emerald-400";
    case "MONITOR":   return "text-sky-400";
    case "ALERT_LOW": return "text-amber-400";
    case "ALERT_HIGH":return "text-orange-400";
    case "CRITICAL":  return "text-rose-500";
    case "FAULT":     return "text-purple-400";
    default:          return "text-slate-400";
  }
}

function fsmBadge(state: FsmState): string {
  switch (state) {
    case "IDLE":      return "bg-emerald-500/15 border-emerald-500/25 text-emerald-300";
    case "MONITOR":   return "bg-sky-500/15 border-sky-500/25 text-sky-300";
    case "ALERT_LOW": return "bg-amber-500/15 border-amber-500/25 text-amber-300";
    case "ALERT_HIGH":return "bg-orange-500/15 border-orange-500/25 text-orange-300";
    case "CRITICAL":  return "bg-rose-500/20 border-rose-500/30 text-rose-300 animate-pulse";
    case "FAULT":     return "bg-purple-500/15 border-purple-500/25 text-purple-300";
    default:          return "bg-slate-700/40 border-slate-600 text-slate-400";
  }
}

function riskColor(risk: number): string {
  if (risk < 0.2) return "text-emerald-400";
  if (risk < 0.4) return "text-sky-400";
  if (risk < 0.65) return "text-amber-400";
  if (risk < 0.85) return "text-orange-400";
  return "text-rose-500";
}

function riskBarColor(risk: number): string {
  if (risk < 0.2) return "bg-emerald-500";
  if (risk < 0.4) return "bg-sky-500";
  if (risk < 0.65) return "bg-amber-500";
  if (risk < 0.85) return "bg-orange-500";
  return "bg-rose-500";
}

function isAlertActive(state: FsmState): boolean {
  return state === "ALERT_HIGH" || state === "CRITICAL";
}

// ── card component ────────────────────────────────────────────────────────────

interface CardProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}

function Card({ label, icon, children, accent = "border-slate-800" }: CardProps) {
  return (
    <div className={`bg-slate-900 border ${accent} rounded-xl p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="text-slate-500">{icon}</div>
      </div>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function OverviewCards() {
  const { current } = useDashboardStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Temperature */}
      <Card label="Temperature" icon={<Thermometer className="w-4 h-4" />}>
        <div className="text-3xl font-bold text-white tabular-nums">
          {current.temperature.toFixed(1)}
          <span className="text-base font-normal text-slate-400 ml-1">°C</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (current.temperature / 50) * 100)}%` }}
          />
        </div>
      </Card>

      {/* Humidity */}
      <Card label="Humidity" icon={<Droplets className="w-4 h-4" />}>
        <div className="text-3xl font-bold text-white tabular-nums">
          {current.humidity.toFixed(1)}
          <span className="text-base font-normal text-slate-400 ml-1">%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, current.humidity)}%` }}
          />
        </div>
      </Card>

      {/* Gas Level */}
      <Card label="Gas Level" icon={<Wind className="w-4 h-4" />}>
        <div className="text-3xl font-bold text-white tabular-nums">
          {current.gas_ppm.toFixed(0)}
          <span className="text-base font-normal text-slate-400 ml-1">ppm</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (current.gas_ppm / 1000) * 100)}%` }}
          />
        </div>
      </Card>

      {/* Motion */}
      <Card label="Motion" icon={<Activity className="w-4 h-4" />}>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              current.pir_state ? "bg-rose-500 animate-pulse" : "bg-slate-600"
            }`}
          />
          <span
            className={`text-2xl font-bold ${
              current.pir_state ? "text-rose-400" : "text-slate-400"
            }`}
          >
            {current.pir_state ? "Detected" : "Clear"}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          PIR sensor (debounced)
        </div>
      </Card>

      {/* Light Level */}
      <Card label="Light Level" icon={<Sun className="w-4 h-4" />}>
        <div className="text-3xl font-bold text-white tabular-nums">
          {(current.ldr_norm * 100).toFixed(0)}
          <span className="text-base font-normal text-slate-400 ml-1">%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, current.ldr_norm * 100)}%` }}
          />
        </div>
      </Card>

      {/* Risk Score */}
      <Card label="Risk Score" icon={<Shield className="w-4 h-4" />}>
        <div className={`text-3xl font-bold tabular-nums ${riskColor(current.risk)}`}>
          {(current.risk * 100).toFixed(1)}
          <span className="text-base font-normal text-slate-400 ml-1">%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${riskBarColor(current.risk)} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, current.risk * 100)}%` }}
          />
        </div>
      </Card>

      {/* FSM State */}
      <Card label="FSM State" icon={<Cpu className="w-4 h-4" />}>
        <span
          className={`inline-block px-3 py-1.5 rounded-lg border text-sm font-bold font-mono ${fsmBadge(
            current.fsm_state
          )}`}
        >
          {current.fsm_state}
        </span>
        <div className={`text-xs font-mono ${fsmColor(current.fsm_state)}`}>
          {current.fsm_state === "IDLE" && "System nominal"}
          {current.fsm_state === "MONITOR" && "Elevated monitoring"}
          {current.fsm_state === "ALERT_LOW" && "Low-level alert active"}
          {current.fsm_state === "ALERT_HIGH" && "High alert — check sensors"}
          {current.fsm_state === "CRITICAL" && "Critical hazard detected"}
          {current.fsm_state === "FAULT" && "Sensor fault detected"}
        </div>
      </Card>

      {/* Alert Status */}
      <Card
        label="Alert Status"
        icon={<Bell className="w-4 h-4" />}
        accent={
          isAlertActive(current.fsm_state)
            ? "border-rose-500/40"
            : "border-slate-800"
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isAlertActive(current.fsm_state)
                ? "bg-rose-500 animate-pulse"
                : "bg-emerald-500"
            }`}
          />
          <span
            className={`text-2xl font-bold ${
              isAlertActive(current.fsm_state)
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {isAlertActive(current.fsm_state) ? "Active" : "Normal"}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {isAlertActive(current.fsm_state)
            ? `FSM: ${current.fsm_state}`
            : "No critical alerts"}
        </div>
      </Card>
    </div>
  );
}
