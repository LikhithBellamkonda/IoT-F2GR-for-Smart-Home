import { useEffect, useRef } from "react";
import { useDashboardStore } from "../store/dashboardStore";
import { CurrentState } from "../types";

const RECONNECT_DELAY_MS = 3000;

export function useMQTT() {
  const { setCurrent, setHealth, addAlert } = useDashboardStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setHealth((prev) => ({ ...prev, mqtt_connected: true }));
      });

      ws.addEventListener("message", (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === "state_update" && msg.data) {
            setCurrent(msg.data as CurrentState);
          } else if (msg.type === "mqtt_status") {
            setHealth((prev) => ({
              ...prev,
              mqtt_connected: Boolean(msg.data?.connected),
              last_update: Date.now(),
            }));
          } else if (msg.type === "alert" && msg.data) {
            addAlert({
              kind: msg.data.kind,
              message: msg.data.message,
              ts: msg.data.ts ?? Date.now(),
            });
          }
        } catch {
          // malformed frame — ignore
        }
      });

      ws.addEventListener("error", () => {
        setHealth((prev) => ({ ...prev, mqtt_connected: false }));
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        setHealth((prev) => ({ ...prev, mqtt_connected: false }));
        if (!destroyed) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      });
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [setCurrent, setHealth, addAlert]);
}
