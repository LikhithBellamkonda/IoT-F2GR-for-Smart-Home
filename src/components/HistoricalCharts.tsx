import React, { useMemo } from "react";
import { ThingSpeakEntry } from "../services/thingspeak";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: ThingSpeakEntry[];
}

export default function HistoricalCharts({ data }: Props) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: parseFloat(d.field1 || "0"),
      humidity: parseFloat(d.field2 || "0"),
      gas: parseFloat(d.field3 || "0"),
      light: parseFloat(d.field5 || "0"),
      risk: parseFloat(d.field6 || "0"),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold mb-2 text-slate-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (title: string, dataKey: string, color: string, height: number = 200) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
      <h3 className="text-slate-400 text-sm font-semibold mb-4 uppercase tracking-wider">{title}</h3>
      <div className="flex-1 min-h-0" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={8} minTickGap={20} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {renderChart("Temperature (°C)", "temp", "#ef4444")}
      {renderChart("Humidity (%)", "humidity", "#3b82f6")}
      {renderChart("Gas (PPM)", "gas", "#8b5cf6")}
      {renderChart("Risk Score", "risk", "#f59e0b")}
      <div className="lg:col-span-2">
        {renderChart("Light Level", "light", "#eab308", 150)}
      </div>
    </div>
  );
}
