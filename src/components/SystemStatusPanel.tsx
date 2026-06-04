import React from "react";
import { ThingSpeakEntry, parseFSMState } from "../services/thingspeak";
import { Clock, Cpu, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

interface Props {
  latestData: ThingSpeakEntry | null;
}

export default function SystemStatusPanel({ latestData }: Props) {
  if (!latestData) {
    return <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">Loading system status...</div>;
  }

  const fsmState = parseFSMState(latestData.field7);
  const motion = latestData.field4 === "1";
  const isCritical = latestData.field8 === "1";
  const lastUpdate = new Date(latestData.created_at).toLocaleString();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-indigo-400" />
        System Status
      </h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
            <Clock className="w-4 h-4" /> Last Update
          </span>
          <span className="text-white font-mono text-sm">{lastUpdate}</span>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
            <Cpu className="w-4 h-4" /> FSM State
          </span>
          <span className="px-3 py-1 bg-indigo-900/40 text-indigo-300 font-bold text-xs rounded-full border border-indigo-700/50">
            {fsmState}
          </span>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
            <Activity className="w-4 h-4" /> Motion Status
          </span>
          <span className={`flex items-center gap-1 font-bold text-sm ${motion ? 'text-orange-400' : 'text-green-400'}`}>
            {motion ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {motion ? "DETECTED" : "CLEAR"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
            <AlertTriangle className="w-4 h-4" /> Critical Alert
          </span>
          <span className={`flex items-center gap-1 font-bold text-sm ${isCritical ? 'text-red-500' : 'text-green-400'}`}>
            {isCritical ? "ACTIVE" : "NORMAL"}
          </span>
        </div>
      </div>
    </div>
  );
}
