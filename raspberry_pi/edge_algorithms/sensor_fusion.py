"""
=========================================================================
Smart Home Monitoring System — Weighted Risk Fusion (sensor_fusion.py)
=========================================================================
Ported from: firmware/main/sensor_fusion.cpp/.h
"""

import time
import logging

from .config import W_T, W_S, W_P, W_H, W_L, DEBUG_LOG

logger = logging.getLogger("SensorFusion")


class SensorReadings:
    """Raw and calibrated sensor readings container."""
    def __init__(self):
        self.raw_temp = 0.0
        self.raw_humidity = 0.0
        self.cal_temp = 0.0
        self.cal_humidity = 0.0
        self.adc_mq2 = 0
        self.ppm_mq2 = 0.0
        self.pir_raw = 0
        self.pir_debounced = 0
        self.adc_ldr = 0
        self.ldr_normalized = 0.0
        self.timestamp_ms = 0


class NormalizedValues:
    """Normalized sensor values and fused risk score."""
    def __init__(self):
        self.n_T = 0.0
        self.n_S = 0.0
        self.n_P = 0.0
        self.n_H = 0.0
        self.n_L = 0.0
        self.risk_score = 0.0  # Consolidated Risk (R)
        self.fusion_time_us = 0


class SensorFusion:
    """Computes weighted multi-sensor risk fusion."""

    def __init__(self):
        self.last_risk_score = 0.0
        self.sensor_vector = [0.0] * 5

    def normalize_sensors(self, raw, out):
        """
        Normalize all sensor readings and compute fused risk score R.
        
        Args:
            raw: SensorReadings instance with calibrated values
            out: NormalizedValues instance to populate
        """
        start_time_us = time.perf_counter_ns() / 1000  # microseconds

        # 1. Normalizing Temperature (T) between 20C and 45C
        out.n_T = max(0.0, min((raw.cal_temp - 20.0) / (45.0 - 20.0), 1.0))

        # 2. Normalizing Gas/Smoke (S) linearly on the MQ2 curve capped at 1000 ppm
        out.n_S = max(0.0, min(raw.ppm_mq2 / 1000.0, 1.0))

        # 3. Normalizing PIR Motion (P) (as a direct indicator)
        out.n_P = float(raw.pir_debounced)

        # 4. Normalizing Desorption Dry Humidity (H) (Higher danger in lower humidity/dry air)
        out.n_H = max(0.0, min(1.0 - (raw.cal_humidity / 100.0), 1.0))

        # 5. Normalizing Darkness (L) (Darkness represents an intrusion risk booster)
        out.n_L = max(0.0, min(1.0 - raw.ldr_normalized, 1.0))

        # Save localized sensor vector values
        self.sensor_vector[0] = out.n_T
        self.sensor_vector[1] = out.n_S
        self.sensor_vector[2] = out.n_P
        self.sensor_vector[3] = out.n_H
        self.sensor_vector[4] = out.n_L

        # 6. Compute fused Risk R
        out.risk_score = (W_T * out.n_T) + \
                         (W_S * out.n_S) + \
                         (W_P * out.n_P) + \
                         (W_H * out.n_H) + \
                         (W_L * out.n_L)

        out.risk_score = max(0.0, min(out.risk_score, 1.0))
        self.last_risk_score = out.risk_score

        if DEBUG_LOG:
            # Ensure math constraints are sound in development mode
            if out.risk_score < 0.0 or out.risk_score > 1.0:
                logger.error("[CRITICAL ERROR] Risk Score out of math bounds [0.0, 1.0]!")

        end_time_us = time.perf_counter_ns() / 1000
        out.fusion_time_us = int(end_time_us - start_time_us)

    def get_risk_score(self):
        """Return the last computed risk score."""
        return self.last_risk_score

    def get_sensor_vector(self):
        """Return the current normalized sensor vector."""
        return self.sensor_vector

    def print_fusion_report(self, raw, out):
        """Print detailed sensor fusion report to console."""
        print("================== SENSOR FUSION REPORT ==================")
        print(f"Raw Telemetry: Temp: {raw.cal_temp:.1f}C, Humid: {raw.cal_humidity:.1f}%, "
              f"Gas: {raw.ppm_mq2:.1f} ppm, PIR: {raw.pir_debounced}, LDR: {raw.adc_ldr}")
        print(f"Normalized Vectors: n_T: {out.n_T:.3f}, n_S: {out.n_S:.3f}, "
              f"n_P: {out.n_P:.3f}, n_H: {out.n_H:.3f}, n_L: {out.n_L:.3f}")
        print(f"Fused Risk R: {out.risk_score:.4f} | Execution Time: {out.fusion_time_us} us")
        print("==========================================================")
