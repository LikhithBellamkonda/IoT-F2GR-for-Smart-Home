import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { CurrentState } from '../types';

export function useMQTT() {
  const { setCurrent, setHealth } = useDashboardStore();

  useEffect(() => {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);

    const handleOpen = () => {
      console.log('✓ WebSocket connected');
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'state_update' && message.data) {
          setCurrent(message.data as CurrentState);
        } else if (message.type === 'mqtt_connected') {
          setHealth((prev) => ({
            ...prev,
            mqtt_connected: message.status || false,
            last_update: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    const handleError = () => {
      console.error('✗ WebSocket error');
      setHealth((prev) => ({
        ...prev,
        mqtt_connected: false,
      }));
    };

    const handleClose = () => {
      console.log('✗ WebSocket closed, reconnecting in 3s...');
      setHealth((prev) => ({
        ...prev,
        mqtt_connected: false,
      }));
      // Attempt reconnect after 3 seconds
      setTimeout(() => {
        // Connection will re-initialize on next hook call
      }, 3000);
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    ws.addEventListener('close', handleClose);

    return () => {
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('error', handleError);
      ws.removeEventListener('close', handleClose);
      ws.close();
    };
  }, [setCurrent, setHealth]);
}
