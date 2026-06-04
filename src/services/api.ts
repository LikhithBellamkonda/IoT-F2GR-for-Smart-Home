import { HealthStatus, HistoryData } from "../types";

const API_BASE = "/api";

export async function getHistoricalData(
  range: "24h" | "7d" | "30d"
): Promise<HistoryData> {
  const res = await fetch(`${API_BASE}/history?range=${range}`);
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
  return res.json();
}

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health fetch failed: ${res.status}`);
  return res.json();
}
