"""
=========================================================================
Smart Home Monitoring System — Gateway Configuration Library (config.py)
=========================================================================
Pin mappings, thresholds, network parameters, and analytical weight vectors.
Dedicated to the modular academic design mapping to DMS, DAA, and Networks.
=========================================================================
Ported from: firmware/main/config.h
"""

# --- Hardware GPIO Configurations (Reference only — not used on Pi) ---
DHT11_DATA_PIN = 4
PIR_PIN = 27
MQ2_ADC_PIN = 34
LDR_ADC_PIN = 35
BUZZER_PIN = 13

RED_LED_PIN = 25
ORANGE_LED_PIN = 26
YELLOW_LED_PIN = 33
GREEN_LED_PIN = 32
BLUE_LED_PIN = 14

# --- WiFi Credentials & Server Targets ---
WIFI_SSID = "Oppo"
WIFI_PASSWORD = "00000000"
WIFI_TIMEOUT_MS = 10000

THINGSPEAK_SERVER = "api.thingspeak.com"
THINGSPEAK_PORT = 443
THINGSPEAK_CHANNEL_ID = 000000          # Replace with actual channel ID
THINGSPEAK_WRITE_API_KEY = "YOUR_KEY_HERE"

MQTT_BROKER_IP = "172.18.163.168"
MQTT_PORT = 1883
MQTT_CLIENT_ID = "SmartHome_RPi"
MQTT_MAX_RETRIES = 3

# --- MQTT Topic Names (8 core channels) ---
TOPIC_SENSORS_RAW = "home/sensors/raw"
TOPIC_SENSORS_NORM = "home/sensors/normalized"
TOPIC_FSM_STATE = "home/fsm/state"
TOPIC_ALERT_CRIT = "home/alerts/critical"
TOPIC_GRAPH_WEIGHTS = "home/graph/weights"
TOPIC_EVAC_PATH = "home/evacuation/path"
TOPIC_PERFORMANCE = "home/performance/report"
TOPIC_FEEDBACK_ACK = "home/ack/feedback"

# --- Formal State Machine Thresholds (Sigma Inputs) ---
THRESH_SIGMA0 = 0.20   # Safe boundary
THRESH_SIGMA1 = 0.40   # Monitor state
THRESH_SIGMA2 = 0.65   # Low alert
THRESH_SIGMA3 = 0.85   # High alert
T_MAX_LIVELOCK = 10    # Jitter defense loops before CRITICAL push

# --- Weighted Risk Fusion Coefficients (Subject: DMS) ---
W_T = 0.30   # Temperature weight coefficient
W_S = 0.35   # Smoke/Gas ppm weight coefficient
W_P = 0.20   # PIR motion weight coefficient
W_H = 0.10   # Desorption/Dry-humidity weight coefficient
W_L = 0.05   # Darkness/Ambient light weight coefficient

# --- Dynamic Route Safety Weights (Subject: DAA) ---
ALPHA = 0.50       # Influence of safety risk score R_bar
BETA = 0.20        # Influence of physical route distance d_ij
GAMMA_PROP = 0.30  # Probability scalar for transition hops
LAMBDA = 2.5       # Spatial exponent parameter
EPSILON = 0.01     # Prevents division singularities

# --- Physical Sensor Constants ---
TEMP_OFFSET = 0.82       # Calibration delta
MQ2_A = 574.25           # Scaling coefficient
MQ2_B = -2.222           # Power regression scaling exponent
MQ2_WARMUP_MS = 20000    # Warmup period (millis)

# --- Diagnostics & Performance ---
PERF_BUFFER_SIZE = 50
MAX_PQ_SIZE = 20
NUM_ZONES = 5
NUM_EDGES = 6
HEALTH_CHECK_INTERVAL_MS = 30000
W_CHECK_STABLE_COUNT = 10
WDT_TIMEOUT_S = 30
SERIAL_BAUD = 115200

TEST_MODE = False
DEBUG_LOG = True
