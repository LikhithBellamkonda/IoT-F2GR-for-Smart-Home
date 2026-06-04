import { Activity, AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { AlertEntry, AlertKind } from "../../types";

function alertIcon(kind: AlertKind) {
  switch (kind) {
    case "motion":
      return <Activity className="w-4 h-4 text-amber-400 shrink-0" />;
    case "high_risk":
      return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
    case "critical_state":
      return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />;
  }
}

function alertLabel(kind: AlertKind): string {
  switch (kind) {
    case "motion":        return "Motion";
    case "high_risk":     return "High Risk";
    case "critical_state":return "Critical";
  }
}

function alertBadge(kind: AlertKind): string {
  switch (kind) {
    case "motion":
      return "bg-amber-500/10 border-amber-500/20 text-amber-300";
    case "high_risk":
      return "bg-orange-500/10 border-orange-500/20 text-orange-300";
    case "critical_state":
      return "bg-rose-500/15 border-rose-500/25 text-rose-300";
  }
}

function fmtTs(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AlertRow({ alert }: { alert: AlertEntry }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      {alertIcon(alert.kind)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${alertBadge(
              alert.kind
            )}`}
          >
            {alertLabel(alert.kind)}
          </span>
          <span className="text-xs text-slate-300 truncate">{alert.message}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
          {fmtTs(alert.ts)}
        </span>
      </div>
    </div>
  );
}

export function AlertCenter() {
  const { alerts, clearAlerts } = useDashboardStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Alert Center
          {alerts.length > 0 && (
            <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
              {alerts.length}
            </span>
          )}
        </h2>
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-60">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
            <ShieldAlert className="w-6 h-6" />
            <span className="text-xs">No alerts recorded</span>
          </div>
        ) : (
          <div>
            {alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
