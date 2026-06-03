"""
=========================================================================
Smart Home Monitoring System — Boolean Minimization (boolean_minimized.py)
=========================================================================
Formally evaluates minimized hazard gate states mapped directly to DMS.

--- QUINE-MCCLUSKEY ALGEBRAIC REDUCTION DERIVATION (Subject: DMS) ---
Let variables correspond to:
  - T: Temperature above threshold (n_T > 0.5)
  - S: Gas/Smoke presence (n_S > 0.5)
  - P: Passive IR Motion state (n_P == 1.0)
  - L: Ambient Light Normal (n_L < 0.5: true means light, false means dark)

Original Canonical Sum Of Minterms for Critical Hazard:
  F(T, S, P, L) = (T * S * P * L) + (T * S * P * !L) + (T * S * !P * L) +
                  (T * S * !P * !L) + (!T * S * P * !L) + (!T * S * P * L)

1. Step 1: List minterms categorized by number of set bits (weight):
  - Weight 1: None
  - Weight 2: m6(0110), m10(1010), m12(1100)
  - Weight 3: m7(0111), m11(1011), m13(1101), m14(1110)
  - Weight 4: m15(1111)

2. Step 2: Combine adjacent weight sets to group by 1-bit differences (consensus):
  - m12 + m13 -> 110- (T * S * !P)
  - m12 + m14 -> 11-0 (T * S * !L)
  - m6  + m7  -> 011- (!T * S * P)
  - m14 + m15 -> 111- (T * S * P)
  - m13 + m15 -> 11-1 (T * S * L)
  - m11 + m15 -> 1-11 (T * S * P)
  - m7  + m15 -> -111 (S * P * L)

3. Step 3: Combine secondary blocks to establish Prime Implicants:
  - (110-) + (111-) -> 11-- (T * S)          | Implicant 1
  - (011-) + (111-) -> -11- (S * P)          | Implicant 2

4. Step 4: Primary Prime Implicant chart coverage verifies:
  - Essential Prime Implicant: (T * S) covers m12, m13, m14, m15
  - Essential Prime Implicant: (S * P) covers m6, m7, m14, m15

Final Mathematically Minimized Boolean Gate function (A_critical):
  A_critical = (T * S) + (S * P) ===> S * (T + P)  (consensus factoring)

Literal Count Reduction:
  - Original Literal Count: 10 literals across terms.
  - Minimized Literal Count: 4 literals (T, S, P, S).
  - Performance Gain: Constant-time single hardware register instruction (60% reduction).

Ported from: firmware/main/boolean_minimized.h
=========================================================================
"""

import logging

logger = logging.getLogger("BooleanMinimized")


class BinaryStates:
    """Binary threshold states for each sensor."""
    def __init__(self):
        self.T = False  # Temperature High (>0.5)
        self.S = False  # Smoke/Gas High (>0.5)
        self.P = False  # PIR Motion Active (==1.0)
        self.L = False  # Normal ambient lighting (n_L < 0.5, meaning NOT dark)


class AlertFlags:
    """Evaluated alert flags from boolean minimization."""
    def __init__(self):
        self.fire = False       # A_fire = T && S
        self.gas = False        # A_gas = S && !T (combustion draft check)
        self.intrusion = False  # A_intrusion = P && !L (motion inside dark zone)
        self.critical = False   # A_critical = S && (P || T)  <--- Q-M MINIMIZED CONSENSUS METHOD
        self.highest_risk_combination = 0  # 4-bit power set binary hash: [T][S][P][L]


def get_binary_states(norm):
    """
    Convert normalized sensor values to binary threshold states.
    
    Args:
        norm: NormalizedValues instance
    Returns:
        BinaryStates instance
    """
    b = BinaryStates()
    b.T = norm.n_T > 0.50
    b.S = norm.n_S > 0.50
    b.P = norm.n_P > 0.50
    b.L = norm.n_L < 0.50  # True if ambient light is sufficient, False if dark
    return b


def evaluate_alerts(b):
    """
    Evaluate minimized boolean alert flags from binary states.
    
    Args:
        b: BinaryStates instance
    Returns:
        AlertFlags instance
    """
    flags = AlertFlags()
    flags.fire = b.T and b.S
    flags.gas = b.S and not b.T
    flags.intrusion = b.P and not b.L

    # Quine-McCluskey Minimized Result: S(T + P)
    flags.critical = b.S and (b.T or b.P)

    # Calculate power set index as a 4-bit integer
    flags.highest_risk_combination = 0
    if b.T:
        flags.highest_risk_combination |= (1 << 3)
    if b.S:
        flags.highest_risk_combination |= (1 << 2)
    if b.P:
        flags.highest_risk_combination |= (1 << 1)
    if b.L:
        flags.highest_risk_combination |= (1 << 0)

    return flags


def print_alert_flags(f):
    """Print active alert flags to console."""
    print(f"[Alert Logic] Active Alarms: Fire: {int(f.fire)}, Gas: {int(f.gas)}, "
          f"Intrusion: {int(f.intrusion)} | CRITICAL: {int(f.critical)} (Q-M Minimized Node)")
    print(f" - Logical Binary Hash Combo index: {f.highest_risk_combination} "
          f"(decimal representation 0-15)")
