"""
=========================================================================
Smart Home Monitoring System — Dijkstra Pathfinder (dijkstra_algorithm.py)
=========================================================================
Ported from: firmware/main/dijkstra_algorithm.cpp/.h
"""

import time
import logging

from .config import NUM_ZONES, EPSILON

logger = logging.getLogger("DijkstraAlgorithm")


class DijkstraResult:
    """Dijkstra shortest path result container."""
    def __init__(self):
        self.dist = [999999.0] * NUM_ZONES
        self.prev = [-1] * NUM_ZONES
        self.path = [-1] * NUM_ZONES
        self.path_length = 0
        self.total_cost = 0.0
        self.execution_time_us = 0
        self.path_differs_from_bfs = False


class MinHeapNode:
    """A node in the min-heap with cost and vertex."""
    def __init__(self, cost=0.0, vertex=0):
        self.cost = cost
        self.vertex = vertex


class MinHeap:
    """Custom min-heap implementation (preserving original C++ logic)."""

    def __init__(self):
        self.heap = []
        self.heap_size = 0
        self.initialize()

    def initialize(self):
        self.heap = [MinHeapNode() for _ in range(NUM_ZONES * 2)]
        self.heap_size = 0

    def _sift_up(self, i):
        while i > 0 and self.heap[(i - 1) // 2].cost > self.heap[i].cost:
            parent = (i - 1) // 2
            self.heap[parent], self.heap[i] = self.heap[i], self.heap[parent]
            i = parent

    def _sift_down(self, i):
        min_index = i
        l = 2 * i + 1
        r = 2 * i + 2

        if l < self.heap_size and self.heap[l].cost < self.heap[min_index].cost:
            min_index = l
        if r < self.heap_size and self.heap[r].cost < self.heap[min_index].cost:
            min_index = r

        if i != min_index:
            self.heap[i], self.heap[min_index] = self.heap[min_index], self.heap[i]
            self._sift_down(min_index)

    def insert(self, cost, v):
        if self.heap_size < NUM_ZONES * 2:
            self.heap[self.heap_size] = MinHeapNode(cost, v)
            self.heap_size += 1
            self._sift_up(self.heap_size - 1)

    def extract_min(self):
        root = self.heap[0]
        if self.heap_size > 0:
            self.heap[0] = self.heap[self.heap_size - 1]
            self.heap_size -= 1
            self._sift_down(0)
        return root

    def is_empty(self):
        return self.heap_size == 0


class DijkstraAlgorithm:
    """Dijkstra shortest path with safety-weighted cost function."""

    def __init__(self):
        self.min_heap = MinHeap()

    @staticmethod
    def compute_safety_cost(graph, i, j):
        """
        Compute safety-weighted traversal cost for edge (i, j).
        W_safe = 1 / (1 - R_avg + epsilon)  (Subject: DAA)
        """
        r_i = graph.get_zone(i).risk_score
        r_j = graph.get_zone(j).risk_score
        R_avg = (r_i + r_j) / 2.0

        denom = 1.0 - R_avg + EPSILON
        return 1.0 / denom

    def run(self, graph, source, exit_zone):
        """
        Execute Dijkstra's algorithm from source to exit_zone.
        
        Args:
            graph: GraphEngine instance
            source: int source node index
            exit_zone: int destination node index
        Returns:
            DijkstraResult instance
        """
        start_time_us = time.perf_counter_ns() / 1000
        result = DijkstraResult()

        visited = [False] * NUM_ZONES
        for i in range(NUM_ZONES):
            result.dist[i] = 999999.0
            result.prev[i] = -1
            result.path[i] = -1

        result.dist[source] = 0.0
        self.min_heap.initialize()
        self.min_heap.insert(0.0, source)

        while not self.min_heap.is_empty():
            node = self.min_heap.extract_min()
            u = node.vertex

            if u == exit_zone:
                break
            if visited[u]:
                continue
            visited[u] = True

            for v in range(NUM_ZONES):
                if graph.has_edge(u, v) and not visited[v]:
                    cost = self.compute_safety_cost(graph, u, v)
                    alt = result.dist[u] + cost
                    if alt < result.dist[v]:
                        result.dist[v] = alt
                        result.prev[v] = u
                        self.min_heap.insert(alt, v)

        # Path reconstruction
        route = []
        curr = exit_zone

        if result.prev[curr] != -1 or curr == source:
            while curr != -1:
                route.append(curr)
                curr = result.prev[curr]

            # Reverse route to match source-to-exit flow
            route.reverse()
            result.path_length = len(route)
            for i in range(len(route)):
                result.path[i] = route[i]
            result.total_cost = result.dist[exit_zone]

        end_time_us = time.perf_counter_ns() / 1000
        result.execution_time_us = int(end_time_us - start_time_us)
        return result

    @staticmethod
    def compare_with_bfs(dijkstra, bfs, source, exit_zone):
        """
        Compare Dijkstra path with BFS path to detect divergence.
        Modifies dijkstra.path_differs_from_bfs in-place.
        """
        # Trace BFS path via parent array from exit back to source
        bfs_route = []
        curr = exit_zone

        bfs_route.append(curr)
        while curr != source and bfs.parent[curr] != -1:
            curr = bfs.parent[curr]
            bfs_route.append(curr)

        # Reverse BFS path
        bfs_path = list(reversed(bfs_route))
        bfs_count = len(bfs_path)

        # Compare arrays
        if bfs_count != dijkstra.path_length:
            dijkstra.path_differs_from_bfs = True
        else:
            for i in range(bfs_count):
                if bfs_path[i] != dijkstra.path[i]:
                    dijkstra.path_differs_from_bfs = True
                    break

        if dijkstra.path_differs_from_bfs:
            logger.info("[Pathfinder Audit] NOTICE: Dijkstra hazard-aware path differs "
                        "from standard min-hop BFS route!")
            bfs_str = " -> ".join(str(n) for n in bfs_path)
            dijk_str = " -> ".join(str(dijkstra.path[i]) for i in range(dijkstra.path_length))
            print(f"  BFS Route: {bfs_str}")
            print(f"  Dijkstra Safety Route: {dijk_str}")

    @staticmethod
    def print_dijkstra_result(result, graph):
        """Print Dijkstra route path to console."""
        print("================ DIJKSTRA ROUTE PATH ==================")
        if result.path_length == 0:
            print("  CRITICAL PATH FAILURE: Destination physically blocked / unreachable!")
        else:
            path_str = " ===> ".join(
                f"[{graph.get_zone(result.path[i]).name}]"
                for i in range(result.path_length)
            )
            print(f"  Safe Evacuation Path: {path_str}")
            print(f"  Dynamic Safe Path Cost Metric: {result.total_cost:.4f} | "
                  f"Pathfinder Time: {result.execution_time_us} us")
        print("=========================================================")
