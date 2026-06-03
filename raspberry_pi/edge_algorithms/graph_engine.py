"""
=========================================================================
Smart Home Monitoring System — Graph Theory Engine (graph_engine.py)
=========================================================================
Ported from: firmware/main/graph_engine.cpp/.h
"""

import time
import math
import logging

from .config import (NUM_ZONES, NUM_EDGES, ALPHA, BETA, GAMMA_PROP, LAMBDA, EPSILON)

logger = logging.getLogger("GraphEngine")


class Zone:
    """Represents a zone/room node in the home graph."""
    def __init__(self, zone_id=0, name="", risk_score=0.1):
        self.id = zone_id
        self.name = name
        self.risk_score = risk_score
        self.sensor_vector = [0.0] * 5
        self.isolated = False


class GraphEngine:
    """
    Manages the house topology graph with dynamic risk-weighted edges.
    5 zones: Living(0), Kitchen(1), Bedroom(2), Hallway(3), Exterior(4)
    """

    def __init__(self):
        self.zones = [Zone() for _ in range(NUM_ZONES)]
        self.adjacency = [[False] * NUM_ZONES for _ in range(NUM_ZONES)]
        self.distances = [[0.0] * NUM_ZONES for _ in range(NUM_ZONES)]
        self.weights = [[0.5] * NUM_ZONES for _ in range(NUM_ZONES)]
        self.last_update_time_us = 0
        self.initialize()

    def initialize(self):
        """Set up zone labels, adjacency matrix, and static distances."""
        # Define human labels (Subject: DMS / DAA)
        names = ["Living", "Kitchen", "Bedroom", "Hallway", "Exterior"]
        for i in range(NUM_ZONES):
            self.zones[i].id = i
            self.zones[i].name = names[i]
            self.zones[i].risk_score = 0.1  # low baseline start
            self.zones[i].isolated = False
            self.zones[i].sensor_vector = [0.0] * 5

        # Clear topologies
        for i in range(NUM_ZONES):
            for j in range(NUM_ZONES):
                self.adjacency[i][j] = False
                self.distances[i][j] = 0.0
                self.weights[i][j] = 0.5

        # Set Static Adjacency & Distance Metrics from section C2
        self._set_edge(0, 1, 0.30)  # Living - Kitchen
        self._set_edge(0, 2, 0.40)  # Living - Bedroom
        self._set_edge(0, 3, 0.25)  # Living - Hallway
        self._set_edge(1, 3, 0.20)  # Kitchen - Hallway
        self._set_edge(2, 3, 0.20)  # Bedroom - Hallway
        self._set_edge(3, 4, 0.35)  # Hallway - Exterior

    def _set_edge(self, i, j, distance):
        """Set a bidirectional edge with given distance."""
        self.adjacency[i][j] = self.adjacency[j][i] = True
        self.distances[i][j] = self.distances[j][i] = distance

    def update_risk_scores(self, R_current):
        """In distributed setup, environment status is mapped globally."""
        for i in range(NUM_ZONES):
            self.zones[i].risk_score = R_current

    def compute_edge_weight(self, i, j, risk_scores):
        """
        Compute dynamic edge weight using the triple-component formula.
        W_edge = α R_bar + β d_ij + γ P_ij
        """
        # 1. Mean safety risk across edges
        R_bar = (risk_scores[i] + risk_scores[j]) / 2.0

        # 2. Linear floor layout distance
        d_ij = self.distances[i][j]

        # 3. Transition potential (probability metric)
        delta_R = abs(risk_scores[i] - risk_scores[j])
        P_ij = 1.0 - math.exp(-LAMBDA * delta_R)

        return (ALPHA * R_bar) + (BETA * d_ij) + (GAMMA_PROP * P_ij)

    def update_all_weights(self):
        """Recompute all edge weights based on current zone risk scores."""
        start_time_us = time.perf_counter_ns() / 1000

        risk_scores = [self.zones[i].risk_score for i in range(NUM_ZONES)]

        for i in range(NUM_ZONES):
            for j in range(NUM_ZONES):
                if self.adjacency[i][j]:
                    # If either zone is physically isolated, block
                    if self.zones[i].isolated or self.zones[j].isolated:
                        self.weights[i][j] = 1.0  # maximum cost weight
                    else:
                        cost = self.compute_edge_weight(i, j, risk_scores)
                        self.weights[i][j] = max(0.0, min(cost, 1.0))
                else:
                    self.weights[i][j] = 1.0  # unconnected default

        end_time_us = time.perf_counter_ns() / 1000
        self.last_update_time_us = int(end_time_us - start_time_us)

    def get_weight(self, i, j):
        return self.weights[i][j]

    def has_edge(self, i, j):
        return self.adjacency[i][j]

    def isolate_zone(self, zone_id):
        """Mark a zone as isolated (fire department/anomaly block)."""
        if 0 <= zone_id < NUM_ZONES:
            self.zones[zone_id].isolated = True
            self.update_all_weights()

    def restore_zone(self, zone_id):
        """Restore an isolated zone."""
        if 0 <= zone_id < NUM_ZONES:
            self.zones[zone_id].isolated = False
            self.update_all_weights()

    def compute_center(self):
        """
        Center is the node with minimum eccentricity (Subject: DMS).
        Uses Floyd-Warshall all-pairs shortest paths over distances.
        """
        INF = 9999.0
        shortest_paths = [[0.0] * NUM_ZONES for _ in range(NUM_ZONES)]

        for i in range(NUM_ZONES):
            for j in range(NUM_ZONES):
                if i == j:
                    shortest_paths[i][j] = 0.0
                elif self.adjacency[i][j]:
                    shortest_paths[i][j] = self.distances[i][j]
                else:
                    shortest_paths[i][j] = INF

        for k in range(NUM_ZONES):
            for i in range(NUM_ZONES):
                for j in range(NUM_ZONES):
                    if shortest_paths[i][k] + shortest_paths[k][j] < shortest_paths[i][j]:
                        shortest_paths[i][j] = shortest_paths[i][k] + shortest_paths[k][j]

        center_node = 0
        min_ecc = INF

        for i in range(NUM_ZONES):
            max_d = 0.0
            for j in range(NUM_ZONES):
                if shortest_paths[i][j] < 999.0 and shortest_paths[i][j] > max_d:
                    max_d = shortest_paths[i][j]
            if max_d < min_ecc:
                min_ecc = max_d
                center_node = i

        return center_node  # Expected: Vertex 3 (Hallway)

    def compute_chromatic(self):
        """
        Greedy 5-node coloring algorithm mapping (Subject: DMS).
        Returns chromatic number (expected: 3 due to triangle loops).
        """
        result = [-1] * NUM_ZONES
        result[0] = 0  # Assign color 0 to vertex 0

        for u in range(1, NUM_ZONES):
            available = [True] * NUM_ZONES
            # Process adjacent vertices
            for v in range(NUM_ZONES):
                if self.adjacency[u][v] and result[v] != -1:
                    available[result[v]] = False  # Mark neighbor color as occupied

            # Find the lowest index color that is unassigned
            for cr in range(NUM_ZONES):
                if available[cr]:
                    result[u] = cr
                    break

        # Count unique colors
        max_color = max(result)
        return max_color + 1  # Number of colors used

    def print_weight_matrix(self):
        """Print the dynamic weight matrix to console."""
        print("================ DYNAMIC WEIGHT MATRIX ==================")
        for i in range(NUM_ZONES):
            row = f"{self.zones[i].name:>8} |"
            for j in range(NUM_ZONES):
                if self.adjacency[i][j]:
                    row += f"  {self.zones[j].name}:{self.weights[i][j]:.2f} "
                else:
                    row += "   ---   "
            print(row)
        print("=========================================================")

    def print_graph_properties(self):
        """Print graph topology audit to console."""
        center = self.compute_center()
        chromatic = self.compute_chromatic()
        print("================ GRAPH TOPOLOGY AUDIT ===================")
        print(f"Vertex Set count (V): {NUM_ZONES} | Edge Set count (E): {NUM_EDGES}")
        print(f"Graph Topographic Center Node: {self.zones[center].name}")
        print(f"Topological Coloring Chromatic Number (X): {chromatic}")
        print("=========================================================")

    def get_last_update_time_us(self):
        return self.last_update_time_us

    def get_zone(self, zone_id):
        return self.zones[zone_id]
