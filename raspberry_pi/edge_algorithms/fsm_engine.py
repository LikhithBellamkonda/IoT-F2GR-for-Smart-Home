"""
=========================================================================
Smart Home Monitoring System — Deterministic FSM Engine (fsm_engine.py)
=========================================================================
Ported from: firmware/main/fsm_engine.cpp/.h
"""

import time
import logging
from enum import IntEnum

from .config import (THRESH_SIGMA0, THRESH_SIGMA1, THRESH_SIGMA2,
                     THRESH_SIGMA3, T_MAX_LIVELOCK)

logger = logging.getLogger("FSMEngine")


class SystemState(IntEnum):
    STATE_IDLE = 0
    STATE_MONITOR = 1
    STATE_ALERT_LOW = 2
    STATE_ALERT_HIGH = 3
    STATE_CRITICAL = 4
    STATE_FAULT = 5


class InputSigma(IntEnum):
    SIGMA_0 = 0  # Safe (R < 0.20)
    SIGMA_1 = 1  # Monitor Safe (0.20 <= R < 0.40)
    SIGMA_2 = 2  # Low Warning (0.40 <= R < 0.65)
    SIGMA_3 = 3  # High Warning (0.65 <= R < 0.85)
    SIGMA_4 = 4  # Critical hazard (R >= 0.85)
    SIGMA_5 = 5  # Sensor Failure / Isolation anomaly


class FSMEngine:
    """Deterministic Finite State Machine with 6x6 transition matrix."""

    def __init__(self):
        self.current_state = SystemState.STATE_IDLE
        self.previous_state = SystemState.STATE_IDLE
        self.livelock_counter = 0
        self.last_transition_time_ms = 0
        self.state_entry_time_ms = time.time() * 1000
        self.transition_time_us = 0

        # The 6x6 canonical Transition Matrix
        self.transition_table = [[None] * 6 for _ in range(6)]
        self.initialize()

    def initialize(self):
        """Populate the complete 36-entry formal FSM delta transition matrix (Subject: DMS)."""
        S = SystemState
        SIG = InputSigma

        # Row 0: STATE_IDLE
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_0] = S.STATE_IDLE
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_IDLE][SIG.SIGMA_5] = S.STATE_FAULT

        # Row 1: STATE_MONITOR
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_0] = S.STATE_IDLE
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_MONITOR][SIG.SIGMA_5] = S.STATE_FAULT

        # Row 2: STATE_ALERT_LOW
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_0] = S.STATE_MONITOR
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_ALERT_LOW][SIG.SIGMA_5] = S.STATE_FAULT

        # Row 3: STATE_ALERT_HIGH
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_0] = S.STATE_MONITOR
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_ALERT_HIGH][SIG.SIGMA_5] = S.STATE_FAULT

        # Row 4: STATE_CRITICAL
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_0] = S.STATE_MONITOR
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_CRITICAL][SIG.SIGMA_5] = S.STATE_FAULT

        # Row 5: STATE_FAULT
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_0] = S.STATE_IDLE
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_1] = S.STATE_MONITOR
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_2] = S.STATE_ALERT_LOW
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_3] = S.STATE_ALERT_HIGH
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_4] = S.STATE_CRITICAL
        self.transition_table[S.STATE_FAULT][SIG.SIGMA_5] = S.STATE_FAULT

    def discretize_input(self, R, sensor_fault):
        """Map continuous risk score R to discrete input sigma symbol."""
        if sensor_fault:
            return InputSigma.SIGMA_5
        if R < THRESH_SIGMA0:
            return InputSigma.SIGMA_0
        if R < THRESH_SIGMA1:
            return InputSigma.SIGMA_1
        if R < THRESH_SIGMA2:
            return InputSigma.SIGMA_2
        if R < THRESH_SIGMA3:
            return InputSigma.SIGMA_3
        return InputSigma.SIGMA_4

    def transition(self, R, sensor_fault):
        """
        Execute FSM transition based on risk score and fault status.
        
        Args:
            R: float risk score [0.0, 1.0]
            sensor_fault: bool indicating sensor failure
        Returns:
            SystemState after transition
        """
        start_time_us = time.perf_counter_ns() / 1000
        input_symbol = self.discretize_input(R, sensor_fault)

        next_state = self.transition_table[self.current_state][input_symbol]

        # --- DMS: Livelock mitigation loops (Defense against boundary jitter oscillations) ---
        if (self.current_state == next_state and
                (self.current_state == SystemState.STATE_ALERT_HIGH or
                 self.current_state == SystemState.STATE_CRITICAL)):
            self.livelock_counter += 1
            if self.livelock_counter >= T_MAX_LIVELOCK:
                self.livelock_counter = 0
                next_state = SystemState.STATE_CRITICAL  # High priority force escalation
                logger.warning("[FSM Livelock] Oscillatory limit breached. Forcing CRITICAL state!")
        else:
            self.livelock_counter = 0

        if next_state != self.current_state:
            self.previous_state = self.current_state
            self.current_state = next_state
            self.last_transition_time_ms = time.time() * 1000
            self.state_entry_time_ms = time.time() * 1000
            logger.info(f"[FSM Transition] Changed: {self.get_state_name(self.previous_state)} -> "
                        f"{self.get_state_name(self.current_state)} "
                        f"(Sigma Symbol: {int(input_symbol)}, Risk R: {R:.4f})")

        end_time_us = time.perf_counter_ns() / 1000
        self.transition_time_us = int(end_time_us - start_time_us)
        return self.current_state

    def get_current_state(self):
        return self.current_state

    def get_previous_state(self):
        return self.previous_state

    @staticmethod
    def get_state_name(s):
        """Return human-readable name for a state."""
        names = {
            SystemState.STATE_IDLE: "IDLE",
            SystemState.STATE_MONITOR: "MONITOR",
            SystemState.STATE_ALERT_LOW: "ALERT_LOW",
            SystemState.STATE_ALERT_HIGH: "ALERT_HIGH",
            SystemState.STATE_CRITICAL: "CRITICAL",
            SystemState.STATE_FAULT: "FAULT",
        }
        return names.get(s, "UNKNOWN")

    def get_current_state_name(self):
        return self.get_state_name(self.current_state)

    # Moore outputs: state determines transmission/reporting intervals (Subject: Networks)
    def get_upload_interval(self):
        """Return reporting interval in milliseconds based on current state."""
        intervals = {
            SystemState.STATE_IDLE: 60000,       # 1 min
            SystemState.STATE_MONITOR: 30000,    # 30 sec
            SystemState.STATE_ALERT_LOW: 15000,  # 15 sec
            SystemState.STATE_ALERT_HIGH: 5000,  # 5 sec
            SystemState.STATE_CRITICAL: 15000,   # 15 sec (constrained for ThingSpeak)
            SystemState.STATE_FAULT: 10000,      # 10 sec
        }
        return intervals.get(self.current_state, 30000)

    def get_mqtt_qos(self):
        """Return MQTT QoS level based on current state."""
        qos = {
            SystemState.STATE_CRITICAL: 2,    # Exactly-Once delivery
            SystemState.STATE_ALERT_HIGH: 1,  # At-Least-Once delivery
            SystemState.STATE_FAULT: 1,
        }
        return qos.get(self.current_state, 0)  # Default: Best effort QoS 0

    def get_buzzer_frequency(self):
        """Return buzzer frequency in Hz based on current state."""
        freqs = {
            SystemState.STATE_ALERT_LOW: 500,   # 500 Hz chime pulse
            SystemState.STATE_ALERT_HIGH: 1000, # 1000 Hz sharp warning pulse
            SystemState.STATE_CRITICAL: 2000,   # 2000 Hz continuous distress frequency
        }
        return freqs.get(self.current_state, 0)  # Default: Silent

    def get_state_entry_time(self):
        return self.state_entry_time_ms

    def get_transition_time_us(self):
        return self.transition_time_us

    def print_fsm_status(self):
        """Print FSM status report to console."""
        in_state_ms = (time.time() * 1000) - self.state_entry_time_ms
        print("==================== FSM STATUS REPORT ====================")
        print(f"Current State: {self.get_current_state_name()} "
              f"(Previous: {self.get_state_name(self.previous_state)}) | "
              f"In-State Duration: {in_state_ms:.0f} ms")
        print(f"MQTT QoS level: {self.get_mqtt_qos()} | "
              f"Reporting Period: {self.get_upload_interval()} ms | "
              f"Sounder: {self.get_buzzer_frequency()} Hz")
        print("===========================================================")

    def verify_properties(self):
        """Review Myhill-Nerode properties of the transition matrix."""
        logger.info("[FSM Validator] Reviewing Myhill-Nerode properties...")
        comprehensive = True
        for st in range(6):
            for sig in range(6):
                outcome = self.transition_table[st][sig]
                if outcome is None or outcome < 0 or outcome > 5:
                    comprehensive = False
                    logger.error(f"[Error] Undefined state outcome in transition matrix at [{st}][{sig}]!")
        if comprehensive:
            logger.info("[FSM Validator] Deterministic 36-entry delta matrix is fully populated.")
