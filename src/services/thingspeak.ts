import axios from 'axios';

export interface ThingSpeakEntry {
  created_at: string;
  entry_id: number;
  field1: string; // Temperature
  field2: string; // Humidity
  field3: string; // MQ2 Gas PPM
  field4: string; // Motion Detection
  field5: string; // LDR Light Level
  field6: string; // Risk Score
  field7: string; // FSM State (index)
  field8: string; // Critical Alert (1 or 0)
}

export interface ThingSpeakResponse {
  channel: any;
  feeds: ThingSpeakEntry[];
}

export const fetchThingSpeakData = async (resultsCount = 50): Promise<ThingSpeakEntry[]> => {
  const channelId = (import.meta as any).env.VITE_THINGSPEAK_CHANNEL_ID;
  const apiKey = (import.meta as any).env.VITE_THINGSPEAK_READ_API_KEY;

  if (!channelId) {
    console.warn("ThingSpeak Channel ID is missing in environment variables.");
    return [];
  }

  try {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json`;
    const response = await axios.get<ThingSpeakResponse>(url, {
      params: {
        api_key: apiKey,
        results: resultsCount,
      }
    });

    return response.data.feeds || [];
  } catch (error) {
    console.error("Error fetching data from ThingSpeak:", error);
    return [];
  }
};

export const parseFSMState = (stateIndexStr: string): string => {
  const map: Record<string, string> = {
    "0": "IDLE",
    "1": "MONITOR",
    "2": "ALERT_LOW",
    "3": "ALERT_HIGH",
    "4": "CRITICAL",
    "5": "FAULT"
  };
  return map[stateIndexStr] || "UNKNOWN";
};
