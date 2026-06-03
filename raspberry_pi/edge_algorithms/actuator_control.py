"""
=========================================================================
Smart Home Monitoring System — Actuator Control (actuator_control.py)
=========================================================================
On the Raspberry Pi, actuator control is achieved by publishing MQTT
commands to the ESP32 sensor nodes instead of directly toggling GPIO pins.
Ported from: firmware/main/actuator_control.cpp/.h
"""

import time
import json
import logging

from .fsm_engine import SystemState

logger = logging.getLogger("ActuatorControl")


class ActuatorControl:
    """
    Manages actuator state outputs via MQTT publish commands.
    Instead of GPIO, publishes JSON commands to ESP32 nodes.
    """

    def __init__(self):
        self.last_flash_toggle_ms = 0
        self.flash_state = False
        self.current_buzzer_freq = 0
        self.buzzer_active = False
        self.mqtt_publisher = None  # Set externally to an MQTT publish function

    def initialize(self, mqtt_publish_func=None):
        """
        Initialize actuator control.
        
        Args:
            mqtt_publish_func: callable(topic, payload) for MQTT publishing
        """
        self.mqtt_publisher = mqtt_publish_func
        self.all_off()

    def _publish_command(self, topic, command_dict):
        """Publish an actuator command via MQTT."""
        if self.mqtt_publisher:
            payload = json.dumps(command_dict)
            self.mqtt_publisher(topic, payload)

    def set_state_output(self, state):
        """
        Set actuator outputs based on FSM state (Moore machine outputs).
        Publishes commands to ESP32 nodes via MQTT.
        """
        # Reset LED
        led_state = {"led_on": False}
        buzzer_freq = 0

        # Set buzzer and state outputs matching Moore machine (Subject: DMS)
        if state == SystemState.STATE_IDLE:
            self.all_off()
            return

        elif state == SystemState.STATE_MONITOR:
            buzzer_freq = 0

        elif state == SystemState.STATE_ALERT_LOW:
            led_state["led_on"] = True
            buzzer_freq = 500  # 500Hz

        elif state == SystemState.STATE_ALERT_HIGH:
            led_state["led_on"] = True
            buzzer_freq = 1000  # 1000Hz

        elif state == SystemState.STATE_CRITICAL:
            led_state["led_on"] = True  # Flash driven in update()
            buzzer_freq = 2000  # 2000Hz continuous

        elif state == SystemState.STATE_FAULT:
            led_state["led_on"] = True  # Flash driven in update()
            buzzer_freq = 0

        self.set_buzzer_frequency(buzzer_freq)
        self._publish_command("home/actuator/led", led_state)

    def update(self, state, current_ms):
        """Handle asynchronous flashing intervals without blocking core flow."""
        if state == SystemState.STATE_CRITICAL:
            if current_ms - self.last_flash_toggle_ms >= 250:  # 2Hz flash
                self.flash_state = not self.flash_state
                self._publish_command("home/actuator/led",
                                      {"led_on": self.flash_state, "flash_mode": "critical"})
                self.last_flash_toggle_ms = current_ms

        elif state == SystemState.STATE_FAULT:
            if current_ms - self.last_flash_toggle_ms >= 500:  # 1Hz flash
                self.flash_state = not self.flash_state
                self._publish_command("home/actuator/led",
                                      {"led_on": self.flash_state, "flash_mode": "fault"})
                self.last_flash_toggle_ms = current_ms

    def trigger_graduated_alert(self, hop_distance):
        """Log graduated alert based on BFS hop distance."""
        if hop_distance == 0:
            logger.info("[Actuators] Active Sector: RED ALERT triggered on source line.")
        elif hop_distance == 1:
            logger.info("[Actuators] Buffer Sector: ORANGE ALERT warning mapped across neighbors.")
        elif hop_distance == 2:
            logger.info("[Actuators] Distant Sector: YELLOW ALERT caution deployed.")

    def set_buzzer_frequency(self, freq_hz):
        """Set buzzer frequency via MQTT command."""
        if freq_hz <= 0:
            self.current_buzzer_freq = 0
            self.buzzer_active = False
        else:
            self.current_buzzer_freq = freq_hz
            self.buzzer_active = True

        self._publish_command("home/actuator/buzzer", {
            "frequency": self.current_buzzer_freq,
            "active": self.buzzer_active
        })

    def all_off(self):
        """Turn off all actuators."""
        self._publish_command("home/actuator/led", {
            "led_on": False
        })
        self._publish_command("home/actuator/buzzer", {
            "frequency": 0, "active": False
        })
        self.buzzer_active = False
        self.current_buzzer_freq = 0

    def print_actuator_status(self, state):
        """Print actuator status report to console."""
        print("================ ACTUATOR STATUS REPORT =================")
        led_status = "FLASHING" if state in (SystemState.STATE_CRITICAL, SystemState.STATE_FAULT) else \
                     "ON" if state in (SystemState.STATE_ALERT_HIGH, SystemState.STATE_ALERT_LOW) else "OFF"
        buzzer_status = "ACTIVE" if self.buzzer_active else "SILENT"

        print(f"  LED State : {led_status} | "
              f"Buzzer State: {buzzer_status} ({self.current_buzzer_freq} Hz)")
        print("=========================================================")
