"""
=========================================================================
Smart Home Monitoring System — Performance Logger (performance_logger.py)
=========================================================================
Ported from: firmware/main/performance_logger.cpp/.h
Note: This is the EDGE ALGORITHM performance logger, distinct from the
existing raspberry_pi/performance_analyzer.py which analyzes received data.
=========================================================================
"""

import math
import json
import logging

from .config import PERF_BUFFER_SIZE

logger = logging.getLogger("PerformanceLogger")


class PerformanceBuffer:
    """Circular buffer for storing performance timing samples."""
    def __init__(self):
        self.data = [0.0] * PERF_BUFFER_SIZE
        self.index = 0
        self.count = 0
        self.full = False


class PerformanceLogger:
    """Logs and computes statistics for all algorithm execution times."""

    def __init__(self):
        self.alert_latency_ms = PerformanceBuffer()
        self.cloud_latency_ms = PerformanceBuffer()
        self.fusion_time_us = PerformanceBuffer()
        self.graph_update_us = PerformanceBuffer()
        self.bfs_time_us = PerformanceBuffer()
        self.dfs_time_us = PerformanceBuffer()
        self.dijkstra_time_us = PerformanceBuffer()
        self.fsm_transition_us = PerformanceBuffer()
        self.mqtt_latency_ms = PerformanceBuffer()
        self.thingspeak_latency_ms = PerformanceBuffer()
        self.cycle_count = 0

    def initialize(self):
        """Reset all buffers to initial state."""
        self.cycle_count = 0
        buffers = [
            self.alert_latency_ms, self.cloud_latency_ms, self.fusion_time_us,
            self.graph_update_us, self.bfs_time_us, self.dfs_time_us,
            self.dijkstra_time_us, self.fsm_transition_us, self.mqtt_latency_ms,
            self.thingspeak_latency_ms
        ]
        for buf in buffers:
            buf.index = 0
            buf.count = 0
            buf.full = False
            buf.data = [0.0] * PERF_BUFFER_SIZE

    @staticmethod
    def _add_to_buffer(buf, value):
        """Add a value to a circular performance buffer."""
        buf.data[buf.index] = value
        buf.index = (buf.index + 1) % PERF_BUFFER_SIZE
        if buf.count < PERF_BUFFER_SIZE:
            buf.count += 1
        else:
            buf.full = True

    @staticmethod
    def _compute_mean(buf):
        """Compute mean of buffer contents."""
        if buf.count == 0:
            return 0.0
        return sum(buf.data[:buf.count]) / buf.count

    @staticmethod
    def _compute_std_dev(buf):
        """Compute sample standard deviation of buffer contents."""
        if buf.count <= 1:
            return 0.0
        mean = sum(buf.data[:buf.count]) / buf.count
        sum_sq = sum((buf.data[i] - mean) ** 2 for i in range(buf.count))
        return math.sqrt(sum_sq / (buf.count - 1))

    @staticmethod
    def _compute_percentile_95(buf):
        """Compute 95th percentile of buffer contents."""
        if buf.count == 0:
            return 0.0

        # Copy and sort
        temp = sorted(buf.data[:buf.count])
        target_idx = int(0.95 * (buf.count - 1))
        return temp[target_idx]

    def log_alert_latency(self, ms):
        self._add_to_buffer(self.alert_latency_ms, ms)

    def log_cloud_latency(self, ms):
        self._add_to_buffer(self.cloud_latency_ms, ms)

    def log_fusion_time(self, us):
        self._add_to_buffer(self.fusion_time_us, us)

    def log_graph_update(self, us):
        self._add_to_buffer(self.graph_update_us, us)

    def log_bfs_time(self, us):
        self._add_to_buffer(self.bfs_time_us, us)

    def log_dfs_time(self, us):
        self._add_to_buffer(self.dfs_time_us, us)

    def log_dijkstra_time(self, us):
        self._add_to_buffer(self.dijkstra_time_us, us)

    def log_fsm_transition(self, us):
        self._add_to_buffer(self.fsm_transition_us, us)

    def log_mqtt_latency(self, ms):
        self._add_to_buffer(self.mqtt_latency_ms, ms)

    def log_thingspeak_latency(self, ms):
        self._add_to_buffer(self.thingspeak_latency_ms, ms)

    def increment_cycle(self):
        self.cycle_count += 1

    def get_cycle_count(self):
        return self.cycle_count

    def print_performance_report(self):
        """Print comprehensive performance benchmark report to console."""
        print("")
        print("=====================================================================")
        print(f"          IoT PERFORMANCES PROFILE BENCHMARK (Cycle: {self.cycle_count})")
        print("=====================================================================")
        print(f" {'Metric Category':<22} | {'Mean':>8} | {'StdDev':>8} | {'95-Pct':>8} | {'Count':>5}")
        print("---------------------------------------------------------------------")

        labels = [
            "Alert Latency (ms)", "Total Cloud Lat (ms)", "Sensor Fusion (us)",
            "Graph Update (us)", "BFS Alarms (us)", "DFS Cycle (us)",
            "Dijkstra (us)", "FSM Transit (us)", "MQTT Pub Lat (ms)",
            "ThingSpeak (ms)"
        ]

        buffers = [
            self.alert_latency_ms, self.cloud_latency_ms, self.fusion_time_us,
            self.graph_update_us, self.bfs_time_us, self.dfs_time_us,
            self.dijkstra_time_us, self.fsm_transition_us, self.mqtt_latency_ms,
            self.thingspeak_latency_ms
        ]

        for i in range(10):
            buf = buffers[i]
            print(f" {labels[i]:<22} | {self._compute_mean(buf):8.2f} | "
                  f"{self._compute_std_dev(buf):8.2f} | "
                  f"{self._compute_percentile_95(buf):8.2f} | {buf.count:5d}")

        print("=====================================================================")
        print("")

    def serialize_to_json(self):
        """Serialize performance metrics to JSON string."""
        data = {
            "cycle": self.cycle_count,
            "timing": {
                "fusion": {
                    "mean": round(self._compute_mean(self.fusion_time_us), 1),
                    "p95": round(self._compute_percentile_95(self.fusion_time_us), 1)
                },
                "fsm": {
                    "mean": round(self._compute_mean(self.fsm_transition_us), 1),
                    "p95": round(self._compute_percentile_95(self.fsm_transition_us), 1)
                },
                "graph": {
                    "mean": round(self._compute_mean(self.graph_update_us), 1),
                    "p95": round(self._compute_percentile_95(self.graph_update_us), 1)
                },
                "bfs": {
                    "mean": round(self._compute_mean(self.bfs_time_us), 1),
                    "p95": round(self._compute_percentile_95(self.bfs_time_us), 1)
                },
                "dfs": {
                    "mean": round(self._compute_mean(self.dfs_time_us), 1),
                    "p95": round(self._compute_percentile_95(self.dfs_time_us), 1)
                },
                "dijkstra": {
                    "mean": round(self._compute_mean(self.dijkstra_time_us), 1),
                    "p95": round(self._compute_percentile_95(self.dijkstra_time_us), 1)
                },
                "alert_lat": {
                    "mean": round(self._compute_mean(self.alert_latency_ms), 1),
                    "p95": round(self._compute_percentile_95(self.alert_latency_ms), 1)
                },
                "mqtt_lat": {
                    "mean": round(self._compute_mean(self.mqtt_latency_ms), 1),
                    "p95": round(self._compute_percentile_95(self.mqtt_latency_ms), 1)
                }
            }
        }
        return json.dumps(data)
