"""
=========================================================================
Smart Home Monitoring System — Sensor Calibration (sensor_calibration.py)
=========================================================================
Ported from: firmware/main/sensor_calibration.cpp/.h
"""

import time
import math
import logging

from .config import TEMP_OFFSET, MQ2_A, MQ2_B, MQ2_WARMUP_MS

logger = logging.getLogger("SensorCalibration")


class CalibrationData:
    """Stores calibration parameters for all sensors."""
    def __init__(self):
        self.temp_offset = TEMP_OFFSET
        self.mq2_r0_baseline = 10000.0  # Default baseline in clean air
        self.ldr_v_min = 100.0          # Raw ADC min LDR output (Bright)
        self.ldr_v_max = 4000.0         # Raw ADC max LDR output (Dark)
        self.valid = True


class SensorCalibration:
    """Handles sensor calibration, PIR debouncing, and normalization."""

    def __init__(self):
        self.start_time_ms = time.time() * 1000
        self.last_debounce_time = 0
        self.last_pir_state = 0  # LOW
        self.debounced_pir_state = 0  # LOW
        self.data = CalibrationData()

    def initialize(self):
        """Initialize with default calibration data."""
        self.data = CalibrationData()

    def init_default_calibration(self):
        """Reset calibration to factory defaults."""
        self.data.temp_offset = TEMP_OFFSET
        self.data.mq2_r0_baseline = 10000.0
        self.data.ldr_v_min = 100.0
        self.data.ldr_v_max = 4000.0
        self.data.valid = True

    def calibrate_dht11(self, raw_temp):
        """Apply temperature calibration offset."""
        return raw_temp + self.data.temp_offset

    def calibrate_humidity(self, raw_humidity):
        """Apply humidity calibration (identity map as specified)."""
        return raw_humidity

    def warmup_mq2(self):
        """Simulate MQ2 warmup period (logging only on Pi)."""
        logger.info("[MQ2] Warming up sensor for gas reading...")
        warmup_seconds = MQ2_WARMUP_MS / 1000.0
        start = time.time()
        while time.time() - start < warmup_seconds:
            remaining = warmup_seconds - (time.time() - start)
            logger.info(f"[MQ2] Warmup active. Remaining: {remaining:.0f} seconds")
            time.sleep(2.0)
        logger.info("[MQ2] Sensor warmed up.")

    def read_mq2_ppm(self, adc_raw, r0):
        """Convert raw ADC reading to PPM using power regression."""
        v_adc = (adc_raw * 3.3) / 4095.0
        v_mq2 = v_adc * 2.0  # Re-scaling via resistor network division
        if v_mq2 < 0.1:
            return 0.0  # Avoid divide-by-zero singularities

        # Read RS load resistor
        rs = ((5.0 / v_mq2) - 1.0) * 10000.0
        ratio = rs / r0
        ppm = MQ2_A * math.pow(ratio, MQ2_B)
        return max(0.0, min(ppm, 10000.0))

    def update_mq2_baseline(self, current_rs):
        """Infinite Impulse Response filter to track long-term trends."""
        self.data.mq2_r0_baseline = (0.999 * self.data.mq2_r0_baseline) + (0.001 * current_rs)

    def debounce_pir(self, gpio_reading, current_millis):
        """Software debounce PIR sensor with 500ms jitter window."""
        if gpio_reading != self.last_pir_state:
            self.last_debounce_time = current_millis

        if (current_millis - self.last_debounce_time) > 500:  # Under 500ms jitter window
            if gpio_reading != self.debounced_pir_state:
                self.debounced_pir_state = gpio_reading

        self.last_pir_state = gpio_reading
        return self.debounced_pir_state

    def normalize_ldr(self, adc_raw, cal_data):
        """Normalize LDR reading to 0.0-1.0 range with adaptive bounds."""
        # Update ambient bounds organically as lighting shifts
        if adc_raw < cal_data.ldr_v_min and adc_raw > 10:
            cal_data.ldr_v_min = adc_raw
        if adc_raw > cal_data.ldr_v_max and adc_raw < 4080:
            cal_data.ldr_v_max = adc_raw

        range_val = cal_data.ldr_v_max - cal_data.ldr_v_min
        if range_val <= 10.0:
            return 0.5

        norm = (adc_raw - cal_data.ldr_v_min) / range_val
        return max(0.0, min(norm, 1.0))

    def get_calibration_quality(self):
        """Return calibration maturity percentage (0-100)."""
        age_ms = (time.time() * 1000) - self.start_time_ms
        if age_ms > 3600000:
            return 100  # Mature baseline (1 hour)
        return int((age_ms * 100.0) / 3600000.0)
