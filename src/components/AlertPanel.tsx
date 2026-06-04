import React from "react";
import { ThingSpeakEntry } from "../services/thingspeak";
import { AlertTriangle, Info, ShieldAlert, Activity } from "lucide-react";

interface Props {
  latestData: ThingSpeakEntry | null;
}

export default function AlertPanel({ latestData }: Props) {
  if (!latestData) {
    return null;
  }

  const motion = latestData.field4 === "1";
  const isCritical = latestData.field8 === "1";
  const risk = parseFloat(latestData.field6 || "0");
  const highRisk = risk > 0.65;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        Alert Panel
      </h3>
      
      <div className="space-y-4">
        {/* Critical Alert */}
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${isCritical ? 'bg-red-950/40 border-red-900/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 ${isCritical ? 'text-red-500' : 'text-slate-500'}`} />
          <div>
            <p className={`font-bold text-sm ${isCritical ? 'text-red-400' : 'text-slate-400'}`}>Critical System Alert</p>
            <p className="text-xs text-slate-500 mt-1">
              {isCritical ? "System has entered CRITICAL FSM state. Hazards detected." : "No critical hazards currently detected."}
            </p>
          </div>
        </div>

        {/* High Risk Alert */}
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${highRisk ? 'bg-orange-950/40 border-orange-900/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <Info className={`w-5 h-5 shrink-0 ${highRisk ? 'text-orange-500' : 'text-slate-500'}`} />
          <div>
            <p className={`font-bold text-sm ${highRisk ? 'text-orange-400' : 'text-slate-400'}`}>High Risk Score</p>
            <p className="text-xs text-slate-500 mt-1">
              {highRisk ? `Fused Risk Score is elevated (${risk.toFixed(3)}). Monitor closely.` : "Risk score is within normal parameters."}
            </p>
          </div>
        </div>

        {/* Motion Alert */}
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${motion ? 'bg-yellow-950/40 border-yellow-900/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <Activity className={`w-5 h-5 shrink-0 ${motion ? 'text-yellow-500' : 'text-slate-500'}`} />
          <div>
            <p className={`font-bold text-sm ${motion ? 'text-yellow-400' : 'text-slate-400'}`}>Motion Detected</p>
            <p className="text-xs text-slate-500 mt-1">
              {motion ? "PIR sensor triggered. Activity registered in monitored zone." : "No motion activity detected."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
