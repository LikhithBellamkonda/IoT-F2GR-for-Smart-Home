"""
=========================================================================
Smart Home Monitoring System — Health Monitor (health_monitor.py)
=========================================================================
Ported from: firmware/main/health_monitor.cpp/.h
"""

import time
import logging
from enum import IntEnum

logger = logging.getLogger("HealthMonitor")


class SensorID(IntEnum):
    SENSOR_TEMP = 0
    SENSOR_HUM = 1
    SENSOR_MQ2 = 2
    SENSOR_PIR = 3
    SENSOR_LDR = 4


class SensorStatus(IntEnum):
    STATUS_HEALTHY = 0
    STATUS_SUSPECT = 1
    STATUS_FAILED = 2


class SensorHealth:
    """Sliding window diagnostics for all sensors."""
    def __init__(self):
        self.status = [SensorStatus.STATUS_HEALTHY] * 5
        self.fault_start_time_ms = [0] * 5
        self.consecutive_healthy_cycles = [0] * 5
        self.recent_readings = [[0.5] * 5 for _ in range(5)]  # 5 sensors, window of 5
        self.reading_index = [0] * 5


class HealthMonitor:
    """
    Monitors sensor health via variance analysis, median filtering,
    and stuck-sensor detection.
    """

    def __init__(self):
        self.health = SensorHealth()
        self.last_check_ms = 0
        self.fault_active = False
        self.initialize()

    def initialize(self):
        """Reset all health tracking to initial state."""
        self.fault_active = False
        for i in range(5):
            self.health.status[i] = SensorStatus.STATUS_HEALTHY
            self.health.fault_start_time_ms[i] = 0
            self.health.consecutive_healthy_cycles[i] = 0
            self.health.reading_index[i] = 0
            for j in range(5):
                self.health.recent_readings[i][j] = 0.5  # Initialize to reasonable mid-ranges

    @staticmethod
    def _compute_variance(readings, n):
        """Compute population variance of readings."""
        total = sum(readings[:n])
        mean = total / n

        var_sum = sum((readings[i] - mean) ** 2 for i in range(n))
        return var_sum / n

    @staticmethod
    def _compute_median(readings, n):
        """Compute median using bubble sort (lightweight for n=5)."""
        temp = readings[:n].copy()
        for i in range(n - 1):
            for j in range(n - i - 1):
                if temp[j] > temp[j + 1]:
                    temp[j], temp[j + 1] = temp[j + 1], temp[j]
        return temp[n // 2]  # For n=5, returns index 2

    def check_sensor(self, sensor_id, readings, n, valid_min, valid_max, spike_threshold):
        """
        Check sensor status based on variance, range, and spike analysis.
        
        Args:
            sensor_id: SensorID enum
            readings: list of recent readings
            n: number of readings
            valid_min: minimum valid value
            valid_max: maximum valid value
            spike_threshold: maximum allowed delta
        Returns:
            SensorStatus
        """
        var = self._compute_variance(readings, n)
        all_same = (var < 0.00001)
        latest = readings[n - 1]
        in_range = (valid_min <= latest <= valid_max)
        delta = abs(latest - readings[0])

        # If a sensor is stuck reading exactly the same out-of-bounds value, it has failed
        if all_same and not in_range:
            return SensorStatus.STATUS_FAILED

        # Implausible transient spikes (Subject: DMS Signal Denoising)
        if delta > spike_threshold and sensor_id != SensorID.SENSOR_PIR:
            return SensorStatus.STATUS_SUSPECT

        if not in_range:
            return SensorStatus.STATUS_FAILED

        return SensorStatus.STATUS_HEALTHY

    def perform_health_check(self, readings):
        """
        Perform a full health check on all sensors.
        
        Args:
            readings: SensorReadings instance
        Returns:
            bool - True if a new fault was detected (triggers FSM SIGMA_5)
        """
        # 1. Shift and append new readings to the sliding diagnostics window
        latest_vals = [
            readings.cal_temp,
            readings.cal_humidity,
            readings.ppm_mq2,
            float(readings.pir_debounced),
            readings.ldr_normalized
        ]

        for s in range(5):
            idx = self.health.reading_index[s]
            self.health.recent_readings[s][idx] = latest_vals[s]
            self.health.reading_index[s] = (idx + 1) % 5

        # 2. Evaluate status
        any_failed = False
        bounds = [
            (-5.0, 65.0, 15.0),     # SENSOR_TEMP: min, max, spike threshold
            (0.0, 100.0, 25.0),     # SENSOR_HUM
            (0.0, 9500.0, 2000.0),  # SENSOR_MQ2
            (0.0, 1.1, 1.5),       # SENSOR_PIR
            (0.0, 1.1, 0.9)        # SENSOR_LDR
        ]

        for s in range(5):
            prev_status = self.health.status[s]
            current_status = self.check_sensor(
                SensorID(s), self.health.recent_readings[s], 5,
                bounds[s][0], bounds[s][1], bounds[s][2]
            )
            self.health.status[s] = current_status

            if current_status == SensorStatus.STATUS_HEALTHY:
                self.health.consecutive_healthy_cycles[s] += 1
                if (prev_status == SensorStatus.STATUS_FAILED and
                        self.health.consecutive_healthy_cycles[s] >= 10):
                    # Recover naturally if stable for 10 consecutive cycles
                    self.health.status[s] = SensorStatus.STATUS_HEALTHY
                    self.health.fault_start_time_ms[s] = 0
                    logger.info(f"[Health Monitor] Sensor '{self.get_sensor_name(SensorID(s))}' "
                                f"recovered. Re-entering healthy mode.")

            elif current_status == SensorStatus.STATUS_FAILED:
                any_failed = True
                self.health.consecutive_healthy_cycles[s] = 0
                if prev_status != SensorStatus.STATUS_FAILED:
                    self.health.fault_start_time_ms[s] = time.time() * 1000
                    logger.warning(f"[Health Monitor] FAIL DETECTED: Sensor "
                                   f"'{self.get_sensor_name(SensorID(s))}' has failed diagnostics.")

            elif current_status == SensorStatus.STATUS_SUSPECT:
                # Suspect files apply median filter directly to smoothen anomalies
                self.health.consecutive_healthy_cycles[s] = 0

        # 3. Evaluate combined fault flag
        if any_failed and not self.fault_active:
            self.fault_active = True
            return True  # Triggered transitional fault state (Sigma 5)

        if not any_failed and self.fault_active:
            self.fault_active = False
            logger.info("[Health Monitor] All sensors verified functional. Normal operation resumed.")

        return False

    def is_fault_active(self):
        return self.fault_active

    def get_sensor_status(self, sensor_id):
        return self.health.status[sensor_id]

    def get_median_filtered(self, sensor_id):
        """Return median-filtered value for a sensor."""
        readings_copy = self.health.recent_readings[sensor_id].copy()
        return self._compute_median(readings_copy, 5)

    def get_fault_duration(self, sensor_id):
        """Return fault duration in milliseconds."""
        if (self.health.status[sensor_id] == SensorStatus.STATUS_FAILED and
                self.health.fault_start_time_ms[sensor_id] > 0):
            return (time.time() * 1000) - self.health.fault_start_time_ms[sensor_id]
        return 0

    @staticmethod
    def get_sensor_name(sensor_id):
        """Return human-readable sensor name."""
        names = {
            SensorID.SENSOR_TEMP: "Temperature",
            SensorID.SENSOR_HUM: "Humidity",
            SensorID.SENSOR_MQ2: "MQ2 MQ_Gas",
            SensorID.SENSOR_PIR: "PIR PIR_Motion",
            SensorID.SENSOR_LDR: "LDR LDR_Light",
        }
        return names.get(sensor_id, "Unknown")

    def print_health_report(self):
        """Print sensor health audit to console."""
        print("================= SENSOR HEALTH AUDIT ===================")
        fault_str = "TRUE (FSM REDIRECT SIGMA_5)" if self.fault_active else "FALSE (SYSTEM CLEAN)"
        print(f"Fault Global active vector flag: {fault_str}")
        for i in range(5):
            if self.health.status[i] == SensorStatus.STATUS_SUSPECT:
                st_label = "SUSPECT (FILTERING)"
            elif self.health.status[i] == SensorStatus.STATUS_FAILED:
                st_label = "FAILED (HARD OUT)"
            else:
                st_label = "HEALTHY"

            print(f"  - Sensor {i} [{self.get_sensor_name(SensorID(i)):>12}]: {st_label} | "
                  f"Fault Duration: {self.get_fault_duration(SensorID(i)):.0f} ms")
        print("=========================================================")
