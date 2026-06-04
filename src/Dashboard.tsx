import React, { useEffect, useState } from "react";
import { fetchThingSpeakData, ThingSpeakEntry } from "./services/thingspeak";
import OverviewCards from "./components/OverviewCards";
import HistoricalCharts from "./components/HistoricalCharts";
import SystemStatusPanel from "./components/SystemStatusPanel";
import AlertPanel from "./components/AlertPanel";
import { RefreshCw, LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<ThingSpeakEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchThingSpeakData(100);
      setData(results);
    } catch (err) {
      setError("Failed to fetch data from ThingSpeak.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds (ThingSpeak standard limit)
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
              <LayoutDashboard className="w-7 h-7 text-indigo-500" />
              Smart Home Telemetry
            </h1>
            <p className="text-slate-400 text-sm mt-1">Edge Computing Node Visualization Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            {error && <span className="text-red-400 text-sm font-semibold">{error}</span>}
            <button 
              onClick={loadData} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Top Cards Section */}
        <OverviewCards latestData={latestData} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Charts */}
          <div className="lg:col-span-2 space-y-6">
            <HistoricalCharts data={data} />
          </div>

          {/* Right Panels */}
          <div className="space-y-6">
            <SystemStatusPanel latestData={latestData} />
            <AlertPanel latestData={latestData} />
          </div>
        </div>

      </div>
    </div>
  );
}
