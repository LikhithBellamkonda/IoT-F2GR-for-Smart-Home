"""
=========================================================================
Smart Home Monitoring System — BFS Traversal Algorithm (bfs_algorithm.py)
=========================================================================
Ported from: firmware/main/bfs_algorithm.cpp/.h
"""

import time
import logging
from enum import IntEnum

from .config import NUM_ZONES

logger = logging.getLogger("BFSAlgorithm")


class VertexColor(IntEnum):
    COLOR_WHITE = 0
    COLOR_GRAY = 1
    COLOR_BLACK = 2


class BFSResult:
    """BFS traversal result container."""
    def __init__(self):
        self.order = [-1] * NUM_ZONES
        self.hop_distance = [999] * NUM_ZONES
        self.parent = [-1] * NUM_ZONES
        self.n_visited = 0
        self.execution_time_us = 0


class BFSAlgorithm:
    """BFS traversal using circular queue with WHITE/GRAY/BLACK coloring."""

    def __init__(self):
        self.queue = [0] * NUM_ZONES
        self.q_head = 0
        self.q_tail = 0
        self.q_size = 0

    def _enqueue(self, v):
        if self.q_size < NUM_ZONES:
            self.queue[self.q_tail] = v
            self.q_tail = (self.q_tail + 1) % NUM_ZONES
            self.q_size += 1

    def _dequeue(self):
        if self.q_size > 0:
            v = self.queue[self.q_head]
            self.q_head = (self.q_head + 1) % NUM_ZONES
            self.q_size -= 1
            return v
        return -1

    def _is_empty(self):
        return self.q_size == 0

    def run(self, graph, source):
        """
        Execute BFS traversal from source node.
        
        Args:
            graph: GraphEngine instance
            source: int source node index
        Returns:
            BFSResult instance
        """
        start_time_us = time.perf_counter_ns() / 1000
        result = BFSResult()

        color = [VertexColor.COLOR_WHITE] * NUM_ZONES

        for i in range(NUM_ZONES):
            result.hop_distance[i] = 999
            result.parent[i] = -1
            result.order[i] = -1

        # Set initial source characteristics
        color[source] = VertexColor.COLOR_GRAY
        result.hop_distance[source] = 0
        result.parent[source] = -1

        self.q_head = 0
        self.q_tail = 0
        self.q_size = 0
        self._enqueue(source)

        visit_idx = 0
        while not self._is_empty():
            u = self._dequeue()
            result.order[visit_idx] = u
            visit_idx += 1

            # Explore neighbors
            for v in range(NUM_ZONES):
                if graph.has_edge(u, v) and color[v] == VertexColor.COLOR_WHITE:
                    color[v] = VertexColor.COLOR_GRAY
                    result.hop_distance[v] = result.hop_distance[u] + 1
                    result.parent[v] = u
                    self._enqueue(v)

            color[u] = VertexColor.COLOR_BLACK

        result.n_visited = visit_idx
        end_time_us = time.perf_counter_ns() / 1000
        result.execution_time_us = int(end_time_us - start_time_us)
        return result

    @staticmethod
    def trigger_graduated_alert(result):
        """Print graduated warning alerts based on BFS hop distance."""
        print(">>> PROPAGATING GRADUATED WARNING ALERTS (BFS MODULATION) <<<")
        for i in range(result.n_visited):
            u = result.order[i]
            hops = result.hop_distance[u]

            if hops == 0:
                color_level = "RED"
                flag = "HOST ZONE TRIGGER (URGENT CRITICAL WARNING ACTIVE)"
            elif hops == 1:
                color_level = "ORANGE"
                flag = "ADJACENT COLLATERAL SAFETY WARNING PREPARE"
            elif hops >= 2:
                color_level = "YELLOW"
                flag = "ROUTINE SECTOR AWARE ACTION ENFORCED"
            else:
                color_level = "WHITE"
                flag = "IDLE"

            print(f" - Hop-Distance Level {hops}: Node idx: {u} | "
                  f"Threat level: {color_level} | Action: {flag}")
        print("---------------------------------------------------------------")

    @staticmethod
    def print_bfs_tree(result, graph):
        """Print BFS propagation tree to console."""
        print("================= BFS PROPAGATION TREE ==================")
        source_name = graph.get_zone(result.order[0]).name if result.n_visited > 0 else "N/A"
        print(f"Source node Anchor: {source_name} | Hops trace:")
        for i in range(NUM_ZONES):
            parent_idx = result.parent[i]
            p_name = graph.get_zone(parent_idx).name if parent_idx != -1 else "NONE (ROOT)"
            print(f"  Zone [{graph.get_zone(i).name:>8}] -> Parents: [{p_name:>8}] | "
                  f"Min-Hop span index: {result.hop_distance[i]}")
        print(f"Total Vertices Discovered: {result.n_visited} | "
              f"Hops Execution Time: {result.execution_time_us} us")
        print("=========================================================")
