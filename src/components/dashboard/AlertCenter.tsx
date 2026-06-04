import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { AlertEntry, AlertKind } from "../../types";

function alertIcon(kind: AlertKind) {
  if (kind === "motion")
    return <Activity className="w-4 h-4 shrink-0" style={{ color:"#f59e0b" }} />;
  if (kind === "high_risk")
    return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color:"#f97316" }} />;
  return (
    <motion.div animate={{ scale:[1,1.2,1] }} transition={{ repeat:Infinity, duration:1.0 }}>
      <ShieldAlert className="w-4 h-4 shrink-0" style={{ color:"var(--rose)" }} />
    </motion.div>
  );
}

function alertLabel(kind: AlertKind) {
  return { motion:"Motion", high_risk:"High Risk", critical_state:"Critical" }[kind];
}

function alertBadgeStyle(kind: AlertKind): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize:"0.60rem", fontWeight:700, letterSpacing:"0.10em",
    textTransform:"uppercase", padding:"2px 8px", borderRadius:"6px",
    border:"1px solid", fontFamily:"var(--font)",
  };
  if (kind === "motion")
    return { ...base, background:"rgba(245,158,11,0.15)", borderColor:"rgba(245,158,11,0.35)", color:"#b45309" };
  if (kind === "high_risk")
    return { ...base, background:"rgba(249,115,22,0.15)", borderColor:"rgba(249,115,22,0.35)", color:"#c2410c" };
  return { ...base, background:"rgba(244,63,94,0.15)", borderColor:"rgba(244,63,94,0.35)", color:"#be123c" };
}

function fmtTs(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function AlertRow({ alert }: { alert: AlertEntry }) {
  return (
    <motion.div
      layout
      initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}
      transition={{ duration:0.28, ease:[0.22,1,0.36,1] }}
      style={{
        display:"flex", alignItems:"flex-start", gap:"0.75rem",
        padding:"0.7rem 0",
        borderBottom:"1px solid rgba(255,255,255,0.28)",
      }}
    >
      {alertIcon(alert.kind)}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={alertBadgeStyle(alert.kind)}>{alertLabel(alert.kind)}</span>
          <span style={{ fontFamily:"var(--font)", fontSize:"0.85rem", color:"var(--text-secondary)",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {alert.message}
          </span>
        </div>
        <span style={{ fontFamily:"var(--font)", fontSize:"0.67rem", color:"var(--text-muted)", display:"block", marginTop:2 }}>
          {fmtTs(alert.ts)}
        </span>
      </div>
    </motion.div>
  );
}

export function AlertCenter() {
  const { alerts, clearAlerts } = useDashboardStore();

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
      transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
      style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.85rem" }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontFamily:"var(--font)", fontSize:"1.1rem", fontWeight:800,
          color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8, margin:0 }}>
          <ShieldAlert className="w-5 h-5" style={{ color:"var(--rose)" }} />
          Alert Center
          <AnimatePresence>
            {alerts.length > 0 && (
              <motion.span
                key="count"
                initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                style={{
                  background:"rgba(244,63,94,0.15)", border:"1px solid rgba(244,63,94,0.35)",
                  color:"#be123c", fontSize:"0.62rem", fontWeight:700, fontFamily:"var(--font)",
                  padding:"1px 8px", borderRadius:"9999px", fontVariantNumeric:"tabular-nums",
                }}
              >
                {alerts.length}
              </motion.span>
            )}
          </AnimatePresence>
        </h2>
        {alerts.length > 0 && (
          <motion.button
            className="btn-ghost" onClick={clearAlerts}
            whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          >
            <Trash2 className="w-3 h-3" /> Clear
          </motion.button>
        )}
      </div>

      <div style={{ overflowY:"auto", maxHeight:"280px" }}>
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", padding:"2.5rem 0", gap:"0.5rem", color:"var(--text-muted)" }}
            >
              <ShieldAlert className="w-7 h-7" style={{ opacity:0.35 }} />
              <span style={{ fontFamily:"var(--font)", fontSize:"0.88rem" }}>No alerts recorded</span>
            </motion.div>
          ) : (
            alerts.map((a) => <AlertRow key={a.id} alert={a} />)
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
