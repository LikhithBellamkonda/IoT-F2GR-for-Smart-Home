import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── FSM data from raspberry_pi/edge_algorithms/fsm_engine.py ─────
const STATES = ["IDLE", "MONITOR", "ALERT_LOW", "ALERT_HIGH", "CRITICAL", "FAULT"];
const SIGMA  = ["σ₀\nR<0.20", "σ₁\n0.20–0.40", "σ₂\n0.40–0.65", "σ₃\n0.65–0.85", "σ₄\nR≥0.85", "σ₅\nFault"];
// transition_table[state][sigma] = nextState  (from fsm_engine.py)
const TRANSITION: number[][] = [
  [0, 1, 2, 3, 4, 5], // IDLE
  [0, 1, 2, 3, 4, 5], // MONITOR
  [1, 1, 2, 3, 4, 5], // ALERT_LOW
  [1, 1, 2, 3, 4, 5], // ALERT_HIGH
  [1, 1, 2, 3, 4, 5], // CRITICAL
  [0, 1, 2, 3, 4, 5], // FAULT
];

// ── State colour map ──────────────────────────────────────────────
const STATE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  IDLE:       { bg:"rgba(13,148,136,0.18)",  border:"rgba(13,148,136,0.50)",  text:"#0f766e", glow:"rgba(13,148,136,0.30)" },
  MONITOR:    { bg:"rgba(56,189,248,0.18)",  border:"rgba(56,189,248,0.50)",  text:"#0284c7", glow:"rgba(56,189,248,0.30)" },
  ALERT_LOW:  { bg:"rgba(245,158,11,0.18)",  border:"rgba(245,158,11,0.50)",  text:"#b45309", glow:"rgba(245,158,11,0.30)" },
  ALERT_HIGH: { bg:"rgba(249,115,22,0.18)",  border:"rgba(249,115,22,0.50)",  text:"#c2410c", glow:"rgba(249,115,22,0.30)" },
  CRITICAL:   { bg:"rgba(244,63,94,0.18)",   border:"rgba(244,63,94,0.50)",   text:"#be123c", glow:"rgba(244,63,94,0.30)" },
  FAULT:      { bg:"rgba(139,92,246,0.18)",  border:"rgba(139,92,246,0.50)",  text:"#7c3aed", glow:"rgba(139,92,246,0.30)" },
};

// ── FSM Positions in SVG ──────────────────────────────────────────
const FSM_POS: [number, number][] = [
  [240,  50], // IDLE (top)
  [400, 140], // MONITOR (right-top)
  [400, 250], // ALERT_LOW (right-bottom)
  [240, 330], // ALERT_HIGH (bottom)
  [ 80, 250], // CRITICAL (left-bottom)
  [ 80, 140], // FAULT (left-top)
];

// ── Boolean logic ─────────────────────────────────────────────────
type BoolState = { T: boolean; S: boolean; P: boolean; L: boolean };

function evalBoolean(b: BoolState) {
  return {
    fire:      b.T && b.S,
    gas:       b.S && !b.T,
    intrusion: b.P && !b.L,
    critical:  b.S && (b.T || b.P),  // Quine-McCluskey: S(T+P)
  };
}

// ── Truth table (from boolean_minimized.py minterms) ─────────────
const MINTERMS = new Set([6, 7, 10, 11, 12, 13, 14, 15]); // A_critical minterms

// ── Graph properties data ────────────────────────────────────────
const ADJ = [
  [0,1,1,1,0],
  [1,0,0,1,0],
  [1,0,0,1,0],
  [1,1,1,0,1],
  [0,0,0,1,0],
];
const DISTS = [
  [0,   0.30, 0.40, 0.25, 0   ],
  [0.30,0,    0,    0.20, 0   ],
  [0.40,0,    0,    0.20, 0   ],
  [0.25,0.20, 0.20, 0,    0.35],
  [0,   0,    0,    0.35, 0   ],
];
const CHROMATIC_COLORS = [0,1,2,0,1]; // from compute_chromatic()
const CHROM_PALETTE = ["#0d9488","#8b5cf6","#f59e0b"];

// ──────────────────────────────────────────────────────────────────

type DmTab = "fsm" | "boolean" | "graph";

export function DiscreteMathViz() {
  const [dmTab, setDmTab] = useState<DmTab>("fsm");

  const tabs: { id: DmTab; label: string }[] = [
    { id:"fsm",     label:"FSM Diagram" },
    { id:"boolean", label:"Boolean Logic" },
    { id:"graph",   label:"Graph Properties" },
  ];

  return (
    <motion.div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }}>

      {/* Inner tab bar */}
      <div className="viz-inner-tabs">
        {tabs.map(t => (
          <motion.button key={t.id}
            className={`viz-inner-tab${dmTab===t.id?" active":""}`}
            onClick={() => setDmTab(t.id)}
            whileTap={{ scale:0.95 }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {dmTab === "fsm" && (
          <motion.div key="fsm"
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
            transition={{ duration:0.3 }}>
            <FSMDiagram />
          </motion.div>
        )}
        {dmTab === "boolean" && (
          <motion.div key="bool"
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
            transition={{ duration:0.3 }}>
            <BooleanViz />
          </motion.div>
        )}
        {dmTab === "graph" && (
          <motion.div key="graph"
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
            transition={{ duration:0.3 }}>
            <GraphProperties />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── FSM Diagram ───────────────────────────────────────────────────
function FSMDiagram() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"1.5rem" }} className="fsm-layout">
      <motion.div className="glass-card" style={{ padding:"1.5rem" }}
        initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}>
        <h3 style={{ fontFamily:"var(--font)", fontSize:"1.1rem", fontWeight:800,
          color:"var(--text-primary)", marginBottom:4 }}>
          6-State Deterministic FSM
        </h3>
        <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:"var(--font)", marginBottom:"1rem" }}>
          Click any state node to highlight outgoing transitions · 36-entry δ transition matrix
        </p>
        <svg viewBox="0 0 480 390" style={{ width:"100%", maxWidth:480, display:"block", margin:"0 auto" }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(90,143,160,0.70)" />
            </marker>
          </defs>

          {/* Transition arrows */}
          {STATES.map((_, fromIdx) =>
            TRANSITION[fromIdx].map((toIdx, sigIdx) => {
              const [x1,y1] = FSM_POS[fromIdx];
              const [x2,y2] = FSM_POS[toIdx];
              if (fromIdx === toIdx) return null; // skip self-loops for clarity
              const isHighlit = active === fromIdx;
              const dx = x2-x1, dy = y2-y1;
              const len = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/len, uy = dy/len;
              const R = 30;
              const sx = x1+ux*R, sy = y1+uy*R;
              const ex = x2-ux*R, ey = y2-uy*R;
              // Slight curve
              const cx = (sx+ex)/2 - uy*22, cy = (sy+ey)/2 + ux*22;
              return (
                <g key={`${fromIdx}-${sigIdx}`} opacity={active !== null && !isHighlit ? 0.15 : 0.70}>
                  <path d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`}
                    fill="none" stroke={isHighlit ? STATE_COLORS[STATES[fromIdx]].text : "rgba(90,143,160,0.55)"}
                    strokeWidth={isHighlit ? 2.0 : 1.0}
                    markerEnd="url(#arrow)" />
                </g>
              );
            })
          )}

          {/* Nodes */}
          {STATES.map((s, i) => {
            const [x,y] = FSM_POS[i];
            const c = STATE_COLORS[s];
            const isActive = active === i;
            return (
              <g key={s} style={{ cursor:"pointer" }} onClick={() => setActive(active===i ? null : i)}>
                {isActive && (
                  <motion.circle cx={x} cy={y} r={36} fill="none"
                    stroke={c.border} strokeWidth={2.5} strokeDasharray="5 3"
                    animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:4, ease:"linear" }}
                    style={{ transformOrigin:`${x}px ${y}px` }}
                  />
                )}
                <circle cx={x} cy={y} r={28} fill={c.bg} stroke={c.border} strokeWidth={1.8} />
                <text x={x} y={y+4} textAnchor="middle"
                  style={{ fontSize:10, fontWeight:800, fontFamily:"Inter,sans-serif", fill:c.text }}>
                  {s.replace("_","\n")}
                </text>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Transition table */}
      <motion.div className="glass-card" style={{ padding:"1.5rem", overflowX:"auto" }}
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
        <h4 style={{ fontFamily:"var(--font)", fontSize:"0.95rem", fontWeight:800,
          color:"var(--text-primary)", marginBottom:"0.85rem" }}>
          δ Transition Table
        </h4>
        <table style={{ borderCollapse:"collapse", width:"100%", fontSize:"0.72rem", fontFamily:"var(--font)" }}>
          <thead>
            <tr>
              <th style={{ padding:"6px 8px", color:"var(--text-muted)", textAlign:"left", fontWeight:700 }}>State</th>
              {SIGMA.map((s,i) => (
                <th key={i} style={{ padding:"4px 6px", color:"var(--teal-dark)", fontWeight:700,
                  whiteSpace:"pre", textAlign:"center", lineHeight:1.3 }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATES.map((st, si) => (
              <tr key={st}
                style={{ background: active===si ? STATE_COLORS[st].bg : "transparent",
                  cursor:"pointer" }}
                onClick={() => setActive(active===si ? null : si)}>
                <td style={{ padding:"6px 8px", fontWeight:700, color:STATE_COLORS[st].text, whiteSpace:"nowrap" }}>{st}</td>
                {TRANSITION[si].map((nextSt, sigi) => (
                  <td key={sigi} style={{ padding:"6px 8px", textAlign:"center",
                    color:STATE_COLORS[STATES[nextSt]].text, fontWeight:600 }}>
                    {STATES[nextSt].replace("ALERT_","A_")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <style>{`@media(min-width:900px){.fsm-layout{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}

// ── Boolean Viz ───────────────────────────────────────────────────
function BooleanViz() {
  const [bits, setBits] = useState<BoolState>({ T:false, S:false, P:false, L:false });
  const flags = evalBoolean(bits);

  const toggle = (k: keyof BoolState) => setBits(b => ({ ...b, [k]: !b[k] }));

  const FlagPill = ({ label, val, color }: { label:string; val:boolean; color:string }) => (
    <motion.div
      animate={{ scale: val ? [1,1.05,1] : 1 }}
      transition={{ duration:0.3 }}
      style={{
        display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
        borderRadius:10, border:"1px solid",
        background: val ? `${color}20` : "rgba(255,255,255,0.20)",
        borderColor: val ? color : "rgba(255,255,255,0.45)",
        fontFamily:"var(--font)", fontSize:"0.82rem", fontWeight:700,
        color: val ? color : "var(--text-muted)",
      }}>
      <motion.div style={{ width:10, height:10, borderRadius:"50%",
        background: val ? color : "rgba(180,200,210,0.45)" }}
        animate={{ boxShadow: val ? `0 0 10px ${color}` : "none" }} />
      {label}: {val ? "1" : "0"}
    </motion.div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"1.5rem" }} className="bool-layout">
      {/* Live evaluator */}
      <motion.div className="glass-card" style={{ padding:"1.5rem" }}
        initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}>
        <h3 style={{ fontFamily:"var(--font)", fontSize:"1.1rem", fontWeight:800,
          color:"var(--text-primary)", marginBottom:4 }}>
          Live Boolean Evaluator
        </h3>
        <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:"var(--font)", marginBottom:"1.25rem" }}>
          Quine-McCluskey minimized: <strong style={{ color:"var(--teal-dark)" }}>A_critical = S·(T + P)</strong>
        </p>

        {/* Toggles */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.85rem", marginBottom:"1.25rem" }}>
          {(Object.keys(bits) as (keyof BoolState)[]).map(k => (
            <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.28)",
              border:"1px solid rgba(255,255,255,0.55)" }}>
              <span style={{ fontFamily:"var(--font)", fontSize:"0.88rem", fontWeight:700, color:"var(--text-secondary)" }}>
                {k === "T" ? "T: Temp High" : k === "S" ? "S: Gas/Smoke" : k === "P" ? "P: PIR Motion" : "L: Light Normal"}
              </span>
              <motion.div whileTap={{ scale:0.9 }}>
                <label className="switch">
                  <input type="checkbox" checked={bits[k]} onChange={() => toggle(k)} />
                  <span className="switch-slider" />
                </label>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Outputs */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
          <FlagPill label="A_fire" val={flags.fire} color="#f59e0b" />
          <FlagPill label="A_gas" val={flags.gas} color="#8b5cf6" />
          <FlagPill label="A_intrusion" val={flags.intrusion} color="#f97316" />
          <FlagPill label="A_critical" val={flags.critical} color="#f43f5e" />
        </div>

        <div style={{ marginTop:"1rem", padding:"0.85rem", borderRadius:12,
          background:"rgba(255,255,255,0.25)", border:"1px solid rgba(255,255,255,0.50)" }}>
          <p style={{ fontFamily:"monospace", fontSize:"0.75rem", color:"var(--text-secondary)", lineHeight:1.7 }}>
            A_fire      = T ∧ S<br/>
            A_gas       = S ∧ ¬T<br/>
            A_intrusion = P ∧ ¬L<br/>
            <strong style={{ color:"var(--teal-dark)" }}>A_critical  = S ∧ (T ∨ P)  ← Q-M minimized</strong>
          </p>
        </div>
      </motion.div>

      {/* Truth table */}
      <motion.div className="glass-card" style={{ padding:"1.5rem", overflowX:"auto" }}
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
        <h4 style={{ fontFamily:"var(--font)", fontSize:"0.95rem", fontWeight:800,
          color:"var(--text-primary)", marginBottom:"0.85rem" }}>
          Truth Table — A_critical = S·(T + P)
        </h4>
        <table style={{ borderCollapse:"collapse", width:"100%", fontSize:"0.72rem", fontFamily:"var(--font)" }}>
          <thead>
            <tr>
              {["m#","T","S","P","L","A_fire","A_gas","A_intru","A_crit"].map(h => (
                <th key={h} style={{ padding:"5px 7px", color:"var(--teal-dark)", fontWeight:700, textAlign:"center",
                  borderBottom:"1px solid rgba(255,255,255,0.40)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:16}, (_,i) => {
              const T=(i>>3)&1, S=(i>>2)&1, P=(i>>1)&1, L=i&1;
              const b = { T:!!T,S:!!S,P:!!P,L:!!L };
              const f = evalBoolean(b);
              const isMinterm = MINTERMS.has(i);
              return (
                <tr key={i} style={{ background: isMinterm ? "rgba(13,148,136,0.10)" : "transparent" }}>
                  <td style={{ padding:"4px 7px", color:"var(--text-muted)", fontWeight:600, textAlign:"center" }}>m{i}</td>
                  {[T,S,P,L].map((v,vi) => (
                    <td key={vi} style={{ padding:"4px 7px", textAlign:"center",
                      color: v ? "var(--teal-dark)" : "var(--text-muted)", fontWeight:v?700:400 }}>{v}</td>
                  ))}
                  {[f.fire,f.gas,f.intrusion,f.critical].map((v,vi) => (
                    <td key={vi} style={{ padding:"4px 7px", textAlign:"center",
                      color: v ? "#f43f5e" : "var(--text-muted)", fontWeight:v?700:400 }}>{v?1:0}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ marginTop:8, fontSize:"0.70rem", color:"var(--text-muted)", fontFamily:"var(--font)" }}>
          ✅ Teal rows = minterms where A_critical = 1 (from boolean_minimized.py)
        </p>
      </motion.div>

      <style>{`@media(min-width:900px){.bool-layout{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}

// ── Graph Properties ──────────────────────────────────────────────
function GraphProperties() {
  const NODE_NAMES = ["Living","Kitchen","Bedroom","Hallway","Exterior"];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"1.5rem" }} className="gp-layout">

      {/* Adjacency matrix */}
      <motion.div className="glass-card" style={{ padding:"1.5rem" }}
        initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}>
        <h3 style={{ fontFamily:"var(--font)", fontSize:"1.1rem", fontWeight:800,
          color:"var(--text-primary)", marginBottom:4 }}>Adjacency & Distance Matrix</h3>
        <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:"var(--font)", marginBottom:"1rem" }}>
          V=5, E=6 · Graph Center: <strong style={{ color:"var(--teal-dark)" }}>Hallway</strong> · Chromatic Number χ=<strong style={{ color:"var(--teal-dark)" }}>3</strong>
        </p>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:"0.78rem", fontFamily:"var(--font)" }}>
            <thead>
              <tr>
                <th style={{ padding:"6px 10px", color:"var(--text-muted)" }}></th>
                {NODE_NAMES.map((n,i) => (
                  <th key={i} style={{ padding:"6px 10px", color:CHROM_PALETTE[CHROMATIC_COLORS[i]], fontWeight:800 }}>
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NODE_NAMES.map((n,i) => (
                <tr key={i}>
                  <td style={{ padding:"6px 10px", fontWeight:800, color:CHROM_PALETTE[CHROMATIC_COLORS[i]] }}>{n}</td>
                  {ADJ[i].map((a,j) => (
                    <motion.td key={j}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: (i*5+j)*0.02 }}
                      style={{
                        padding:"6px 12px", textAlign:"center", fontWeight:a?700:400,
                        color: a ? "var(--teal-dark)" : "var(--text-muted)",
                        background: a ? "rgba(13,148,136,0.10)" : "transparent",
                        border:"1px solid rgba(255,255,255,0.25)",
                        borderRadius:6,
                      }}>
                      {a ? DISTS[i][j].toFixed(2) : "—"}
                    </motion.td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Graph properties summary */}
      <motion.div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>

        {/* Chromatic colouring */}
        <div className="glass-card" style={{ padding:"1.25rem" }}>
          <h4 style={{ fontFamily:"var(--font)", fontSize:"0.95rem", fontWeight:800,
            color:"var(--text-primary)", marginBottom:"0.75rem" }}>
            Greedy Graph Colouring  (χ = 3)
          </h4>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {NODE_NAMES.map((n,i) => (
              <motion.div key={n}
                initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.05*i, type:"spring" }}
                style={{
                  padding:"8px 16px", borderRadius:10,
                  background:`${CHROM_PALETTE[CHROMATIC_COLORS[i]]}20`,
                  border:`1.5px solid ${CHROM_PALETTE[CHROMATIC_COLORS[i]]}`,
                  fontFamily:"var(--font)", fontSize:"0.82rem", fontWeight:700,
                  color:CHROM_PALETTE[CHROMATIC_COLORS[i]],
                }}>
                {n} <span style={{ fontWeight:400, opacity:0.7 }}>C{CHROMATIC_COLORS[i]+1}</span>
              </motion.div>
            ))}
          </div>
          <p style={{ marginTop:10, fontSize:"0.72rem", color:"var(--text-muted)", fontFamily:"var(--font)" }}>
            3 colours needed · Triangle cycles: Living–Bedroom–Hallway, Living–Kitchen–Hallway
          </p>
        </div>

        {/* Properties */}
        <div className="glass-card" style={{ padding:"1.25rem" }}>
          <h4 style={{ fontFamily:"var(--font)", fontSize:"0.95rem", fontWeight:800,
            color:"var(--text-primary)", marginBottom:"0.85rem" }}>
            Topological Properties
          </h4>
          {[
            ["Vertex Set |V|","5 zones"],
            ["Edge Set |E|","6 connections"],
            ["Graph Center","Hallway (min eccentricity)"],
            ["Chromatic No. χ","3 (triangle-induced)"],
            ["Graph Type","Connected, undirected, weighted"],
            ["Weight Range","0.20 – 0.40 (static distances)"],
            ["Degree of Hallway","4 (highest — central hub)"],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
              borderBottom:"1px solid rgba(255,255,255,0.25)" }}>
              <span style={{ fontFamily:"var(--font)", fontSize:"0.82rem", color:"var(--text-muted)" }}>{k}</span>
              <span style={{ fontFamily:"var(--font)", fontSize:"0.82rem", fontWeight:700, color:"var(--text-secondary)" }}>{v}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <style>{`@media(min-width:900px){.gp-layout{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}
