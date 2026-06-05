import { create } from "zustand";
import { CurrentState, GraphState, HealthStatus, HistoryData, AlertEntry } from "../types";

const MAX_ALERTS = 50;

interface DashboardStore {
  current: CurrentState;
  setCurrent: (state: CurrentState) => void;

  // Live graph topology from the Pi's Dijkstra engine (null until first MQTT packet)
  graphState: GraphState | null;
  setGraphState: (g: GraphState | null) => void;

  health: HealthStatus;
  setHealth: (health: HealthStatus | ((prev: HealthStatus) => HealthStatus)) => void;

  history: HistoryData;
  setHistory: (data: HistoryData) => void;

  alerts: AlertEntry[];
  addAlert: (alert: Omit<AlertEntry, "id">) => void;
  clearAlerts: () => void;

  isLoadingHistory: boolean;
  setIsLoadingHistory: (loading: boolean) => void;

  historyRange: "24h" | "7d" | "30d";
  setHistoryRange: (range: "24h" | "7d" | "30d") => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  current: {
    temperature: 0,
    humidity: 0,
    gas_ppm: 0,
    pir_state: false,
    ldr_raw: 0,
    ldr_norm: 0,
    risk: 0,
    fsm_state: "IDLE",
    ts: 0,
  },
  setCurrent: (state) => set({ current: state }),

  graphState: null,
  setGraphState: (g) => set({ graphState: g }),

  health: {
    mqtt_connected: false,
    last_update: 0,
    packet_rate: 0,
    uptime_seconds: 0,
  },
  setHealth: (health) =>
    set((s) => ({
      health: typeof health === "function" ? health(s.health) : health,
    })),

  history: {
    temperatures: [],
    humidities: [],
    gases: [],
    risks: [],
  },
  setHistory: (data) => set({ history: data }),

  alerts: [],
  addAlert: (alert) =>
    set((s) => {
      const entry: AlertEntry = {
        ...alert,
        id: `${alert.ts}-${alert.kind}-${Math.random().toString(36).slice(2, 7)}`,
      };
      const updated = [entry, ...s.alerts].slice(0, MAX_ALERTS);
      return { alerts: updated };
    }),
  clearAlerts: () => set({ alerts: [] }),

  isLoadingHistory: false,
  setIsLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

  historyRange: "24h",
  setHistoryRange: (range) => set({ historyRange: range }),
}));
