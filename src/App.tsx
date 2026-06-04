import { useEffect } from "react";
import { Home } from "lucide-react";
import { useMQTT } from "./hooks/useMQTT";
import { useHistoricalData } from "./hooks/useHistoricalData";
import { OverviewCards } from "./components/dashboard/OverviewCards";
import { SystemHealth } from "./components/dashboard/SystemHealth";
import { Charts } from "./components/dashboard/Charts";
import { AlertCenter } from "./components/dashboard/AlertCenter";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
        Live
      </span>
    </div>
  );
}

function Dashboard() {
  useMQTT();
  useHistoricalData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/15 border border-indigo-500/25 rounded-lg">
            <Home className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Smart Home Monitor
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
              Real-time IoT Dashboard
            </p>
          </div>
        </div>
        <LiveIndicator />
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <SystemHealth />

        <section>
          <SectionLabel>Live Sensors</SectionLabel>
          <OverviewCards />
        </section>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <Charts />
          </div>
          <div className="xl:w-80 shrink-0">
            <AlertCenter />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.body.className = "bg-slate-950";
  }, []);

  return <Dashboard />;
}
