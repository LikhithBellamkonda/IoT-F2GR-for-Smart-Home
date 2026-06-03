"""
=========================================================================
Smart Home Monitoring System — Edge Algorithms Package
=========================================================================
Python ports of the C++ firmware edge algorithms originally running on
the ESP32 master backplane. Now executed on the Raspberry Pi coordinator.

This package provides:
  - config: All system constants, thresholds, and weight coefficients
  - sensor_calibration: DHT11/MQ2/PIR/LDR calibration and normalization
  - sensor_fusion: Weighted multi-sensor risk fusion (R score)
  - boolean_minimized: Quine-McCluskey minimized alert logic
  - fsm_engine: 6-state deterministic FSM with 6x6 transition matrix
  - graph_engine: 5-zone house topology with dynamic weighted edges
  - bfs_algorithm: BFS traversal for graduated alert propagation
  - dfs_algorithm: DFS traversal for cycle detection and evacuation ordering
  - dijkstra_algorithm: Safety-weighted shortest path evacuation routing
  - priority_queue: Max-heap MQTT message priority scheduling
  - actuator_control: MQTT-based actuator command publishing
  - health_monitor: Sensor health diagnostics with sliding window analysis
  - performance_logger: Algorithm execution time profiling and statistics
=========================================================================
"""

from .config import *
from .sensor_calibration import SensorCalibration, CalibrationData
from .sensor_fusion import SensorFusion, SensorReadings, NormalizedValues
from .boolean_minimized import (BinaryStates, AlertFlags,
                                 get_binary_states, evaluate_alerts, print_alert_flags)
from .fsm_engine import FSMEngine, SystemState, InputSigma
from .graph_engine import GraphEngine, Zone
from .bfs_algorithm import BFSAlgorithm, BFSResult, VertexColor
from .dfs_algorithm import DFSAlgorithm, DFSResult
from .dijkstra_algorithm import DijkstraAlgorithm, DijkstraResult
from .priority_queue import PriorityQueue, MQTTMessage
from .actuator_control import ActuatorControl
from .health_monitor import HealthMonitor, SensorID, SensorStatus
from .performance_logger import PerformanceLogger
