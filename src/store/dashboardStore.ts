import { create } from 'zustand';
import { CurrentState, HealthStatus, HistoricalData } from '../types';

interface DashboardStore {
  // Current state
  current: CurrentState;
  setCurrent: (state: CurrentState) => void;

  // Health status
  health: HealthStatus;
  setHealth: (health: HealthStatus) => void;

  // Historical data
  history: {
    temperatures: HistoricalData;
    humidities: HistoricalData;
    gases: HistoricalData;
    risks: HistoricalData;
  };
  setHistory: (key: string, data: HistoricalData) => void;

  // UI State
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Loading states
  isLoadingHistory: boolean;
  setIsLoadingHistory: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  current: {
    temperature: 0,
    humidity: 0,
    gas_ppm: 0,
    motion: false,
    light: false,
    risk_score: 0,
    fsm_state: 'STATE_IDLE',
    timestamp: Date.now(),
  },
  setCurrent: (state) => set({ current: state }),

  health: {
    mqtt_connected: false,
    last_update: 0,
    packet_rate: 0,
    uptime_seconds: 0,
  },
  setHealth: (health) => set({ health }),

  history: {
    temperatures: { range: '24h', data: [] },
    humidities: { range: '24h', data: [] },
    gases: { range: '24h', data: [] },
    risks: { range: '24h', data: [] },
  },
  setHistory: (key, data) =>
    set((state) => ({
      history: { ...state.history, [key]: data },
    })),

  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
  },

  isLoadingHistory: false,
  setIsLoadingHistory: (loading) => set({ isLoadingHistory: loading }),
}));
