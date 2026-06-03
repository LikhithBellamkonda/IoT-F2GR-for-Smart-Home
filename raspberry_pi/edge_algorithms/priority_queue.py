"""
=========================================================================
Smart Home Monitoring System — Priority Queue (priority_queue.py)
=========================================================================
Ported from: firmware/main/priority_queue.cpp/.h
"""

import time
import logging

from .config import MAX_PQ_SIZE, DEBUG_LOG

logger = logging.getLogger("PriorityQueue")


class MQTTMessage:
    """MQTT message container with priority and sequence metadata."""
    def __init__(self, payload="", topic="", priority=-1, qos=0,
                 timestamp_ms=0, sequence_number=-1):
        self.payload = payload
        self.topic = topic
        self.priority = priority
        self.qos = qos
        self.timestamp_ms = timestamp_ms
        self.sequence_number = sequence_number


def _is_higher_priority(a, b):
    """Custom priority tiebreaker: higher priority wins. If equal, oldest sequence number wins (FIFO)."""
    if a.priority > b.priority:
        return True
    if a.priority == b.priority:
        return a.sequence_number < b.sequence_number  # Older sequence number gets prioritized
    return False


class PriorityQueue:
    """Max-heap priority queue for MQTT message scheduling."""

    def __init__(self):
        self.heap = [MQTTMessage() for _ in range(MAX_PQ_SIZE)]
        self.current_size = 0
        self.sequence_counter = 0
        self.last_enqueue_time_us = 0
        self.last_dequeue_time_us = 0

    def initialize(self):
        """Reset queue to empty state."""
        self.heap = [MQTTMessage() for _ in range(MAX_PQ_SIZE)]
        self.current_size = 0
        self.sequence_counter = 0
        self.last_enqueue_time_us = 0
        self.last_dequeue_time_us = 0

    @staticmethod
    def _parent(i):
        return (i - 1) // 2

    @staticmethod
    def _left_child(i):
        return 2 * i + 1

    @staticmethod
    def _right_child(i):
        return 2 * i + 2

    def _sift_up(self, i):
        while i > 0 and _is_higher_priority(self.heap[i], self.heap[self._parent(i)]):
            p = self._parent(i)
            self.heap[p], self.heap[i] = self.heap[i], self.heap[p]
            i = p

    def _sift_down(self, i):
        max_index = i
        l = self._left_child(i)
        r = self._right_child(i)

        if l < self.current_size and _is_higher_priority(self.heap[l], self.heap[max_index]):
            max_index = l
        if r < self.current_size and _is_higher_priority(self.heap[r], self.heap[max_index]):
            max_index = r

        if i != max_index:
            self.heap[i], self.heap[max_index] = self.heap[max_index], self.heap[i]
            self._sift_down(max_index)

    def _find_min_priority_index(self):
        """Find the index of the least urgent message in the queue."""
        if self.current_size == 0:
            return -1
        min_idx = 0
        for i in range(1, self.current_size):
            if not _is_higher_priority(self.heap[i], self.heap[min_idx]):
                min_idx = i
        return min_idx

    def insert(self, payload, topic, priority, qos):
        """
        Insert a message into the priority queue.
        If queue is full, evicts the lowest-priority message if new one is more urgent.
        
        Returns:
            bool indicating success
        """
        start_time_us = time.perf_counter_ns() / 1000

        msg = MQTTMessage(
            payload=payload[:255],
            topic=topic[:63],
            priority=priority,
            qos=qos,
            timestamp_ms=time.time() * 1000,
            sequence_number=self.sequence_counter
        )
        self.sequence_counter += 1

        success = False

        if self.current_size < MAX_PQ_SIZE:
            self.heap[self.current_size] = msg
            self.current_size += 1
            self._sift_up(self.current_size - 1)
            success = True
        else:
            # Saturated queue: find minimum priority payload to drop
            min_idx = self._find_min_priority_index()
            if min_idx != -1 and _is_higher_priority(msg, self.heap[min_idx]):
                if DEBUG_LOG:
                    logger.debug(f"[PQ Alert] Queue overflow. Swapping out lower priority "
                                 f"topic: {self.heap[min_idx].topic}")
                self.heap[min_idx] = msg
                self._sift_up(min_idx)
                self._sift_down(min_idx)
                success = True
            else:
                if DEBUG_LOG:
                    logger.debug(f"[PQ Alert] Queue saturated. Dropped payload of "
                                 f"priority {priority} on topic: {topic}")
                success = False

        end_time_us = time.perf_counter_ns() / 1000
        self.last_enqueue_time_us = int(end_time_us - start_time_us)
        return success

    def extract_max(self):
        """Remove and return the highest-priority message."""
        start_time_us = time.perf_counter_ns() / 1000
        empty_msg = MQTTMessage()

        if self.current_size == 0:
            end_time_us = time.perf_counter_ns() / 1000
            self.last_dequeue_time_us = int(end_time_us - start_time_us)
            return empty_msg

        root = self.heap[0]
        self.heap[0] = self.heap[self.current_size - 1]
        self.current_size -= 1
        if self.current_size > 0:
            self._sift_down(0)

        end_time_us = time.perf_counter_ns() / 1000
        self.last_dequeue_time_us = int(end_time_us - start_time_us)
        return root

    def peek_max(self):
        """Return the highest-priority message without removing it."""
        if self.current_size == 0:
            return MQTTMessage()
        return self.heap[0]

    def is_empty(self):
        return self.current_size == 0

    def get_size(self):
        return self.current_size

    @staticmethod
    def get_qos_for_priority(priority):
        """Map message priority to MQTT QoS level."""
        if priority == 3:
            return 2  # Critical -> QoS 2
        if priority == 2:
            return 1  # High Alert -> QoS 1
        return 0       # Standard monitor -> QoS 0

    def print_queue(self):
        """Print queue contents to console."""
        print(f"================= PRIORITY QUEUE ({self.current_size}/{MAX_PQ_SIZE}) ================")
        for i in range(self.current_size):
            print(f"  Root element index {i:2d}: Topic [{self.heap[i].topic:>20}] | "
                  f"Priority {self.heap[i].priority} | Seq: {self.heap[i].sequence_number}")
        print("=========================================================")

    def get_last_enqueue_time_us(self):
        return self.last_enqueue_time_us

    def get_last_dequeue_time_us(self):
        return self.last_dequeue_time_us
