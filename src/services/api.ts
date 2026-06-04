import { CurrentState, HealthStatus, HistoricalData } from '../types';

const API_BASE = '/api';

export async function getCurrentState(): Promise<CurrentState> {
  const response = await fetch(`${API_BASE}/current`);
  if (!response.ok) throw new Error('Failed to fetch current state');
  return response.json();
}

export async function getHistoricalData(
  range: '24h' | '7d' | '30d'
): Promise<HistoricalData> {
  const response = await fetch(`${API_BASE}/history?range=${range}`);
  if (!response.ok) throw new Error('Failed to fetch historical data');
  return response.json();
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Failed to fetch health status');
  return response.json();
}
