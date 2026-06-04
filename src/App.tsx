import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMQTT } from "./hooks/useMQTT";
import { useHistoricalData } from "./hooks/useHistoricalData";
import { OverviewCards } from "./components/dashboard/OverviewCards";
import { SystemHealth } from "./components/dashboard/SystemHealth";
import { Charts } from "./components/dashboard/Charts";
import { AlertCenter } from "./components/dashboard/AlertCenter";
import { VisualizationTab } from "./components/visualization/VisualizationTab";

type Tab = "analytics" | "visualization";



function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function AnalyticsTab() {
  useMQTT();
  useHistoricalData();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <motion.div variants={itemVariants}>
        <SystemHealth />
      </motion.div>

      <motion.section variants={itemVariants}>
        <SectionLabel>Live Sensors</SectionLabel>
        <OverviewCards />
      </motion.section>

      <motion.div
        variants={itemVariants}
        style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        className="charts-row"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Charts />
        </div>
        <div className="alert-col">
          <AlertCenter />
        </div>
      </motion.div>

      <style>{`
        @media (min-width: 1280px) {
          .charts-row { flex-direction: row !important; }
          .alert-col  { width: 22rem; flex-shrink: 0; }
        }
      `}</style>
    </motion.div>
  );
}

function TabPill({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "analytics", label: "Analytics" },
    { id: "visualization", label: "Visualization" },
  ];

  return (
    <div className="tab-pill">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab-pill-btn${active === t.id ? " active" : ""}`}
          style={{ position: "relative" }}
          onClick={() => onChange(t.id)}
        >
          {active === t.id && (
            <motion.span
              layoutId="tab-indicator"
              className="tab-pill-indicator"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            />
          )}
          <span style={{ position: "relative", zIndex: 2 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("analytics");

  useEffect(() => {
    document.body.style.background = "transparent";
    document.body.style.color = "var(--text-primary)";
    document.body.style.fontFamily = "var(--font)";
  }, []);

  return (
    <div className="app-bg">
      {/* ── Header ─────────────────────────────────────── */}
      <header
        style={{
          background: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.55)",
          padding: "0 2rem",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ minWidth: "110px" }} />

        <div style={{ textAlign: "center", flex: 1 }}>
          <h1
            style={{
              fontFamily: "var(--font)",
              fontSize: "1.35rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, var(--teal-dark) 0%, var(--sky-dark) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            Smart Home Monitor
          </h1>
          <p
            style={{
              fontFamily: "var(--font)",
              fontSize: "0.62rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Real-Time IoT Dashboard
          </p>
        </div>

        <div style={{ minWidth: "110px", display: "flex", justifyContent: "flex-end" }}>
          
        </div>
      </header>

      {/* ── Floating Tab Pill ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "1.25rem 0 0.5rem",
          position: "sticky",
          top: "68px",
          zIndex: 40,
        }}
      >
        <TabPill active={tab} onChange={setTab} />
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <main
        style={{
          maxWidth: "90rem",
          margin: "0 auto",
          padding: "1.5rem 1.75rem 3rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          {tab === "analytics" ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnalyticsTab />
            </motion.div>
          ) : (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <VisualizationTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
