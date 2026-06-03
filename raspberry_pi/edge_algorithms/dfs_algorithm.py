"""
=========================================================================
Smart Home Monitoring System — DFS Traversal Algorithm (dfs_algorithm.py)
=========================================================================
Ported from: firmware/main/dfs_algorithm.cpp/.h
"""

import time
import logging

from .config import NUM_ZONES
from .bfs_algorithm import VertexColor

logger = logging.getLogger("DFSAlgorithm")


class DFSResult:
    """DFS traversal result container."""
    def __init__(self):
        self.discovery_time = [0] * NUM_ZONES
        self.finish_time = [0] * NUM_ZONES
        self.parent = [-1] * NUM_ZONES
        self.back_edges = []  # list of (u, v) tuples
        self.n_back_edges = 0
        self.evacuation_order = list(range(NUM_ZONES))  # Sorted by ascending finish times
        self.execution_time_us = 0


class DFSAlgorithm:
    """DFS traversal with back-edge detection and evacuation ordering."""

    def __init__(self):
        self.time_counter = 0
        self.color = [VertexColor.COLOR_WHITE] * NUM_ZONES

    def _dfs_visit(self, graph, u, result):
        """Recursive DFS visit subroutine."""
        self.color[u] = VertexColor.COLOR_GRAY
        self.time_counter += 1
        result.discovery_time[u] = self.time_counter

        for v in range(NUM_ZONES):
            if graph.has_edge(u, v):
                if self.color[v] == VertexColor.COLOR_WHITE:
                    result.parent[v] = u
                    self._dfs_visit(graph, v, result)
                elif self.color[v] == VertexColor.COLOR_GRAY and result.parent[u] != v:
                    # Found back-edge (Subject: DMS/DAA cycle loop detection)
                    # Avoid duplicate counting backwards
                    duplicate = False
                    for edge in result.back_edges:
                        if (edge[0] == v and edge[1] == u) or (edge[0] == u and edge[1] == v):
                            duplicate = True
                            break
                    if not duplicate and result.n_back_edges < 10:
                        result.back_edges.append((u, v))
                        result.n_back_edges += 1

        self.color[u] = VertexColor.COLOR_BLACK
        self.time_counter += 1
        result.finish_time[u] = self.time_counter

    def run(self, graph, source):
        """
        Execute DFS traversal from source node.
        
        Args:
            graph: GraphEngine instance
            source: int source node index
        Returns:
            DFSResult instance
        """
        start_time_us = time.perf_counter_ns() / 1000
        result = DFSResult()
        self.time_counter = 0

        for i in range(NUM_ZONES):
            self.color[i] = VertexColor.COLOR_WHITE
            result.parent[i] = -1
            result.discovery_time[i] = 0
            result.finish_time[i] = 0
            result.evacuation_order[i] = i

        # Visit source first to prioritize evacuation mapping
        self._dfs_visit(graph, source, result)

        # Visit rest of nodes if disconnected islands present
        for i in range(NUM_ZONES):
            if self.color[i] == VertexColor.COLOR_WHITE:
                self._dfs_visit(graph, i, result)

        self.compute_evacuation_order(result)

        end_time_us = time.perf_counter_ns() / 1000
        result.execution_time_us = int(end_time_us - start_time_us)
        return result

    @staticmethod
    def compute_evacuation_order(result):
        """Sort evacuation_order array based on ascending order of finish_time (bubble sort, N=5)."""
        for i in range(NUM_ZONES - 1):
            for j in range(NUM_ZONES - i - 1):
                idx_a = result.evacuation_order[j]
                idx_b = result.evacuation_order[j + 1]
                if result.finish_time[idx_a] > result.finish_time[idx_b]:
                    result.evacuation_order[j], result.evacuation_order[j + 1] = \
                        result.evacuation_order[j + 1], result.evacuation_order[j]

    @staticmethod
    def identify_cycle_traps(result, graph):
        """Print toxic gas circulation cycle traps analysis."""
        print(">>> TOXIC GAS CIRCULATION CYCLE TRAPS ANALYSIS <<<")
        if result.n_back_edges == 0:
            print(" - No loop traps detected. Airflow routes are safely acyclic.")
        else:
            for edge in result.back_edges:
                u, v = edge
                print(f" - Loop Trap detected on path: [{graph.get_zone(u).name}] "
                      f"<====> [{graph.get_zone(v).name}]. Forced ventilation needed here!")
        print("------------------------------------------------------------------")

    @staticmethod
    def print_dfs_results(result, graph):
        """Print DFS anomaly analysis to console."""
        print("================== DFS ANOMALY ANALYSIS ===================")
        for i in range(NUM_ZONES):
            p_idx = result.parent[i]
            p_name = graph.get_zone(p_idx).name if p_idx != -1 else "NONE"
            print(f"  Zone [{graph.get_zone(i).name:>8}] -> Parent: [{p_name:>8}] | "
                  f"Discovery: {result.discovery_time[i]:2d} / Finish: {result.finish_time[i]:2d}")

        evac_str = " -> ".join(graph.get_zone(result.evacuation_order[i]).name
                               for i in range(NUM_ZONES))
        print(f"  Calculated Evacuation Order (Priority ascending finish): {evac_str}")
        print(f"  Exhaustive discovery runtime: {result.execution_time_us} us")
        print("=========================================================")

    @staticmethod
    def print_comparison(bfs, dfs, graph):
        """Print BFS-propagation vs DFS-evacuation comparison."""
        print("=========== BFS-PROPAGATION VS DFS-EVACUATION ===========")
        print(f"{'BFS Alarm Order':<20} {'DFS Evacuation Order':<20}")
        print(f"{'----------------':<20} {'--------------------':<20}")
        for i in range(NUM_ZONES):
            b_name = graph.get_zone(bfs.order[i]).name if bfs.order[i] != -1 else "---"
            d_name = graph.get_zone(dfs.evacuation_order[i]).name
            print(f"{i+1}: {b_name:<17} {i+1}: {d_name:<17}")
        print("=========================================================")
