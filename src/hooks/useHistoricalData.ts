import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import {
  getCurrentState,
  getHistoricalData,
  getHealth,
} from '../services/api';

export function useHistoricalData(range: '24h' | '7d' | '30d' = '24h') {
  const { setHistory, setIsLoadingHistory, setHealth } = useDashboardStore();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingHistory(true);
      try {
        // Fetch all data in parallel
        const [tempData, healthData] = await Promise.all([
          getHistoricalData(range),
          getHealth(),
        ]);

        // Since we only have risk_score from CSV, we'll use it for all charts
        // In a real scenario, you'd have separate columns for each metric
        setHistory('temperatures', tempData);
        setHistory('humidities', tempData);
        setHistory('gases', tempData);
        setHistory('risks', tempData);

        setHealth(healthData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchData();
    // Fetch health status periodically
    const healthInterval = setInterval(async () => {
      try {
        const health = await getHealth();
        setHealth(health);
      } catch (error) {
        console.error('Error fetching health:', error);
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(healthInterval);
  }, [range, setHistory, setIsLoadingHistory, setHealth]);
}
