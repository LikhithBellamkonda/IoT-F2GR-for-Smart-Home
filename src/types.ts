// FSM states as published by the coordinator's get_current_state_name()
export type FsmState =
  | "IDLE"
  | "MONITOR"
  | "ALERT_LOW"
  | "ALERT_HIGH"
  | "CRITICAL"
  | "FAULT";

// Live sensor + processed state — merged from all 4 MQTT topics
export interface CurrentState {
  // From home/node/env/sensors
  temperature: number;   // °C
  humidity: number;      // %
  gas_ppm: number;       // ppm

  // From home/node/motion/sensors
  pir_state: boolean;    // debounced motion state

  // From home/node/light/sensors
  ldr_raw: number;       // ADC value 0–4095
  ldr_norm: number;      // normalised 0–1 (0 = dark, 1 = bright)

  // From home/sensors/normalized (published when state >= MONITOR)
  risk: number;          // fused risk score 0–1
  fsm_state: FsmState;

  ts: number;            // milliseconds timestamp of last update
}

// Health metadata from /api/health
export interface HealthStatus {
  mqtt_connected: boolean;
  last_update: number;        // ms timestamp
  packet_rate: number;        // packets / second (rolling 10 s)
  uptime_seconds: number;
}

// A single time-series data point from /api/history
export interface HistoryPoint {
  ts: number;    // ms timestamp
  value: number;
}

// Full history response from /api/history
export interface HistoryData {
  temperatures: HistoryPoint[];
  humidities: HistoryPoint[];
  gases: HistoryPoint[];
  risks: HistoryPoint[];
}

// Alert entry for AlertCenter
export type AlertKind = "motion" | "high_risk" | "critical_state";

export interface AlertEntry {
  id: string;
  kind: AlertKind;
  message: string;
  ts: number;
}
