import React from "react";
import { ThingSpeakEntry, parseFSMState } from "../services/thingspeak";
import { Thermometer, Droplets, ShieldAlert, Activity, Sun, Layers, AlertCircle, Wind } from "lucide-react";

interface Props {
  latestData: ThingSpeakEntry | null;
}

export default function OverviewCards({ latestData }: Props) {
  if (!latestData) {
    return <div className="text-gray-400">Waiting for data...</div>;
  }

  const temp = parseFloat(latestData.field1 || "0").toFixed(1);
  const hum = parseFloat(latestData.field2 || "0").toFixed(1);
  const gas = parseFloat(latestData.field3 || "0").toFixed(1);
  const motion = latestData.field4 === "1" ? "Detected" : "Clear";
  const light = parseFloat(latestData.field5 || "0").toFixed(3);
  const risk = parseFloat(latestData.field6 || "0").toFixed(3);
  const fsmState = parseFSMState(latestData.field7);
  const isCritical = latestData.field8 === "1";

  const cards = [
    { label: "Temperature", value: `${temp} °C`, icon: <Thermometer className="text-red-400" /> },
    { label: "Humidity", value: `${hum} %`, icon: <Droplets className="text-blue-400" /> },
    { label: "Gas (MQ2)", value: `${gas} PPM`, icon: <Wind className="text-purple-400" /> },
    { label: "Motion", value: motion, icon: <Activity className="text-green-400" /> },
    { label: "Light (LDR)", value: light, icon: <Sun className="text-yellow-400" /> },
    { label: "Risk Score", value: risk, icon: <ShieldAlert className="text-orange-400" /> },
    { label: "FSM State", value: fsmState, icon: <Layers className="text-indigo-400" /> },
    { label: "Alert Status", value: isCritical ? "CRITICAL" : "NORMAL", icon: <AlertCircle className={isCritical ? "text-red-500" : "text-gray-400"} />, valueColor: isCritical ? "text-red-500 font-bold" : "text-white" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-lg">
            {c.icon}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{c.label}</p>
            <p className={`text-xl font-bold ${c.valueColor || 'text-white'}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
