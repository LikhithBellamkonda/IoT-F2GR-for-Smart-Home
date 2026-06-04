import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Info } from "lucide-react";

// ── Constants from raspberry_pi/edge_algorithms/config.py ────────
const ALPHA = 0.50;
const BETA  = 0.20;
const GAMMA = 0.30;
const LAMBDA = 2.5;
const EPSILON = 0.01;

// ── Graph from graph_engine.py ────────────────────────────────────
// Zones: Living(0) Kitchen(1) Bedroom(2) Hallway(3) Exterior(4)
const NODE_NAMES = ["Living", "Kitchen", "Bedroom", "Hallway", "Exterior"];
const NODE_POS: [number, number][] = [
  [160, 260], // Living
  [340, 260], // Kitchen
  [160, 120], // Bedroom
  [280, 170], // Hallway
  [280,  50], // Exterior (exit)
];
// [from, to, distance]
const STATIC_EDGES: [number, number, number][] = [
  [0, 1, 0.30], // Living - Kitchen
  [0, 2, 0.40], // Living - Bedroom
  [0, 3, 0.25], // Living - Hallway
  [1, 3, 0.20], // Kitchen - Hallway
  [2, 3, 0.20], // Bedroom - Hallway
  [3, 4, 0.35], // Hallway - Exterior
];

// ── Weight formula (graph_engine.py compute_edge_weight) ─────────
function computeEdgeWeight(riskScores: number[], i: number, j: number, dist: number): number {
  const R_bar = (riskScores[i] + riskScores[j]) / 2;
  const delta_R = Math.abs(riskScores[i] - riskScores[j]);
  const P_ij = 1 - Math.exp(-LAMBDA * delta_R);
  return Math.min(1, Math.max(0, ALPHA * R_bar + BETA * dist + GAMMA * P_ij));
}

// ── Safety cost (dijkstra_algorithm.py compute_safety_cost) ──────
function safetyCost(r_i: number, r_j: number): number {
  const R_avg = (r_i + r_j) / 2;
  return 1 / (1 - R_avg + EPSILON);
}

// ── Dijkstra implementation ───────────────────────────────────────
interface DijkResult { dist: number[]; prev: number[]; path: number[]; steps: string[] }
function runDijkstra(risks: number[], source: number, exit: number): DijkResult {
  const n = 5;
  const dist = Array(n).fill(Infinity);
  const prev = Array(n).fill(-1);
  const visited = Array(n).fill(false);
  const steps: string[] = [];

  dist[source] = 0;
  const pq: [number, number][] = [[0, source]]; // [cost, node]

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited[u]) continue;
    visited[u] = true;
    steps.push(`Pop ${NODE_NAMES[u]} (cost=${d.toFixed(3)})`);

    for (const [a, b, _] of STATIC_EDGES) {
      const v = a === u ? b : b === u ? a : -1;
      if (v === -1 || visited[v]) continue;
      const cost = safetyCost(risks[u], risks[v]);
      const alt = dist[u] + cost;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push([alt, v]);
        steps.push(`  Relax ${NODE_NAMES[u]}→${NODE_NAMES[v]} cost=${cost.toFixed(3)} → dist=${alt.toFixed(3)}`);
      }
    }
  }

  // Reconstruct path
  const path: number[] = [];
  let curr = exit;
  while (curr !== -1) { path.unshift(curr); curr = prev[curr]; }

  return { dist, prev, path, steps };
}

// ── Node colour by risk ───────────────────────────────────────────
function nodeColor(r: number) {
  if (r < 0.20) return { fill:"#0d9488", glow:"rgba(13,148,136,0.45)" };
  if (r < 0.40) return { fill:"#38bdf8", glow:"rgba(56,189,248,0.45)" };
  if (r < 0.65) return { fill:"#f59e0b", glow:"rgba(245,158,11,0.45)" };
  if (r < 0.85) return { fill:"#f97316", glow:"rgba(249,115,22,0.45)" };
  return { fill:"#f43f5e", glow:"rgba(244,63,94,0.45)" };
}
function edgeColor(w: number) {
  if (w < 0.35) return "#10b981";
  if (w < 0.65) return "#fbbf24";
  return "#f43f5e";
}

// ── Component ─────────────────────────────────────────────────────
export function DijkstraViz() {
  const [risk, setRisk] = useState(0.25);
  const [source, setSource] = useState(0);
  const [result, setResult] = useState<DijkResult | null>(null);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const risks = Array(5).fill(risk);
  const edgeWeights = STATIC_EDGES.map(([a, b, d]) => computeEdgeWeight(risks, a, b, d));

  const handleRun = useCallback(() => {
    if (running) return;
    setResult(null);
    setStepIdx(0);
    setRunning(true);
    const res = runDijkstra(risks, source, 4);
    setResult(res);
    let i = 0;
    function next() {
      i++;
      setStepIdx(i);
      if (i < res.steps.length) timerRef.current = setTimeout(next, 280);
      else setRunning(false);
    }
    timerRef.current = setTimeout(next, 200);
  }, [risk, source, running]);

  const handleReset = () => {
    clearTimeout(timerRef.current);
    setResult(null); setStepIdx(0); setRunning(false);
  };

  const pathSet = result ? new Set<string>(
    result.path.slice(0,-1).map((n,i) => {
      const nxt = result.path[i+1];
      return [Math.min(n,nxt), Math.max(n,nxt)].join("-");
    })
  ) : new Set<string>();

  const SVG_W = 480, SVG_H = 320;
  const scaleX = (x: number) => (x / 480) * SVG_W;
  const scaleY = (y: number) => (y / 320) * SVG_H;

  const normPos: [number, number][] = NODE_POS.map(([x, y]) => [
    (x / 480) * SVG_W, (y / 320) * SVG_H,
  ]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"1.5rem" }} className="dijk-layout">

        {/* Graph SVG */}
        <motion.div className="glass-card"
          initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
          style={{ padding:"1.5rem" }}>
          <h3 style={{ fontFamily:"var(--font)", fontSize:"1.1rem", fontWeight:800,
            color:"var(--text-primary)", marginBottom:"0.5rem" }}>
            🏠 Smart Home Zone Graph
          </h3>
          <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginBottom:"1rem", fontFamily:"var(--font)" }}>
            5 zones · 6 edges · Dynamic risk-weighted traversal (W = αR̄ + βd + γP)
          </p>

          <svg viewBox="0 0 480 320" style={{ width:"100%", maxWidth:480, display:"block", margin:"0 auto" }}>
            <defs>
              {NODE_POS.map((_,i) => (
                <radialGradient key={i} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={nodeColor(risks[i]).fill} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={nodeColor(risks[i]).fill} stopOpacity={0} />
                </radialGradient>
              ))}
            </defs>

            {/* Edges */}
            {STATIC_EDGES.map(([a, b, _], idx) => {
              const [x1,y1] = NODE_POS[a];
              const [x2,y2] = NODE_POS[b];
              const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
              const inPath = pathSet.has(key);
              const w = edgeWeights[idx];
              const mx = (x1+x2)/2, my = (y1+y2)/2;
              return (
                <g key={idx}>
                  {inPath && (
                    <motion.line x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#38bdf8" strokeWidth={10} strokeOpacity={0.30}
                      initial={{ pathLength:0 }} animate={{ pathLength:1 }}
                      transition={{ duration:0.6 }} />
                  )}
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={inPath ? "#0d9488" : edgeColor(w)}
                    strokeWidth={inPath ? 3.5 : 1.8}
                    strokeOpacity={0.85} />
                  <rect x={mx-18} y={my-9} width={36} height={18} rx={5}
                    fill="rgba(255,255,255,0.55)" />
                  <text x={mx} y={my+4} textAnchor="middle"
                    style={{ fontSize:10, fontFamily:"Inter,sans-serif", fontWeight:600,
                      fill: edgeColor(w) }}>
                    {w.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {NODE_POS.map(([x,y], i) => {
              const { fill, glow } = nodeColor(risks[i]);
              const inPath = result?.path.includes(i) ?? false;
              const isSrc = i === source;
              const isExit = i === 4;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={28} fill={`url(#glow-${i})`} />
                  <motion.circle cx={x} cy={y} r={22}
                    fill={fill} fillOpacity={0.88}
                    stroke={inPath ? "#ffffff" : "rgba(255,255,255,0.60)"}
                    strokeWidth={inPath ? 3 : 1.5}
                    animate={inPath ? { scale:[1,1.12,1] } : { scale:1 }}
                    transition={{ repeat: inPath ? Infinity : 0, duration:1.2 }} />
                  {isSrc && <circle cx={x} cy={y} r={26} fill="none" stroke="#0d9488" strokeWidth={2} strokeDasharray="4 3" />}
                  {isExit && <circle cx={x} cy={y} r={26} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 3" />}
                  <text x={x} y={y+4} textAnchor="middle"
                    style={{ fontSize:9, fontFamily:"Inter,sans-serif", fontWeight:800, fill:"white" }}>
                    R:{risks[i].toFixed(2)}
                  </text>
                  <text x={x} y={y+34} textAnchor="middle"
                    style={{ fontSize:11, fontFamily:"Inter,sans-serif", fontWeight:700,
                      fill:"var(--text-primary)" }}>
                    {NODE_NAMES[i]}{isSrc?" (src)":""}{isExit?" 🚪":""}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap", marginTop:"0.75rem" }}>
            {[["#10b981","Safe (w<0.35)"],["#fbbf24","Moderate (0.35–0.65)"],["#f43f5e","Hazard (w>0.65)"],["#0d9488","Dijkstra Path"]].map(([c,l])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:c }} />
                <span style={{ fontSize:"0.70rem", color:"var(--text-muted)", fontFamily:"var(--font)" }}>{l}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Controls + result */}
        <motion.div className="glass-card"
          initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.5, delay:0.1, ease:[0.22,1,0.36,1] }}
          style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Risk Slider */}
          <div>
            <label style={{ fontFamily:"var(--font)", fontSize:"0.85rem", fontWeight:700, color:"var(--text-secondary)", display:"block", marginBottom:8 }}>
              Global Risk Score: <span style={{ color:"var(--teal-dark)", fontSize:"1rem" }}>{(risk*100).toFixed(0)}%</span>
            </label>
            <input type="range" min={0} max={1} step={0.01}
              value={risk} onChange={e => { setRisk(+e.target.value); handleReset(); }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.68rem", color:"var(--text-muted)", fontFamily:"var(--font)", marginTop:3 }}>
              <span>Safe (0%)</span><span>Critical (100%)</span>
            </div>
          </div>

          {/* Source selector */}
          <div>
            <label style={{ fontFamily:"var(--font)", fontSize:"0.85rem", fontWeight:700, color:"var(--text-secondary)", display:"block", marginBottom:8 }}>
              Start Zone
            </label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[0,1,2,3].map(i => (
                <motion.button key={i}
                  onClick={() => { setSource(i); handleReset(); }}
                  whileTap={{ scale:0.94 }}
                  style={{
                    padding:"6px 14px", borderRadius:9, border:"1px solid",
                    fontFamily:"var(--font)", fontSize:"0.80rem", fontWeight:600,
                    cursor:"pointer",
                    background: source===i ? "linear-gradient(135deg,var(--teal),var(--sky-dark))" : "rgba(255,255,255,0.30)",
                    borderColor: source===i ? "transparent" : "rgba(255,255,255,0.55)",
                    color: source===i ? "white" : "var(--text-secondary)",
                    boxShadow: source===i ? "0 4px 12px rgba(13,148,136,0.35)" : "none",
                  }}>
                  {NODE_NAMES[i]}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Run / Reset */}
          <div style={{ display:"flex", gap:"0.75rem" }}>
            <motion.button className="btn-teal" onClick={handleRun}
              disabled={running}
              whileTap={{ scale:0.94 }}
              style={{ opacity: running ? 0.7 : 1, flex:1 }}>
              {running
                ? <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:"linear" }}>⏳</motion.span>
                : <Play className="w-4 h-4" />}
              {running ? "Running…" : "Run Dijkstra"}
            </motion.button>
            <motion.button className="btn-ghost" onClick={handleReset} whileTap={{ scale:0.94 }}>
              <RotateCcw className="w-4 h-4" /> Reset
            </motion.button>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
                style={{ background:"rgba(13,148,136,0.08)", border:"1px solid rgba(13,148,136,0.25)",
                  borderRadius:14, padding:"1rem" }}>
                <div style={{ fontFamily:"var(--font)", fontSize:"0.82rem", fontWeight:700,
                  color:"var(--teal-dark)", marginBottom:6 }}>
                  🛣️ Safe Evacuation Path
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  {result.path.map((n,i) => (
                    <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ background:"rgba(13,148,136,0.15)", border:"1px solid rgba(13,148,136,0.30)",
                        borderRadius:8, padding:"3px 10px", fontFamily:"var(--font)", fontSize:"0.80rem",
                        fontWeight:700, color:"var(--teal-dark)" }}>
                        {NODE_NAMES[n]}
                      </span>
                      {i < result.path.length-1 && <span style={{ color:"var(--text-muted)", fontSize:"1rem" }}>→</span>}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:"var(--font)" }}>
                  Total safety cost: <strong style={{ color:"var(--teal-dark)" }}>{result.dist[4].toFixed(4)}</strong>
                  &nbsp;·&nbsp; Formula: W_safe = 1 / (1 − R_avg + ε)
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step log */}
          <AnimatePresence>
            {result && result.steps.length > 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ background:"rgba(255,255,255,0.30)", border:"1px solid rgba(255,255,255,0.55)",
                  borderRadius:12, padding:"0.85rem", maxHeight:160, overflowY:"auto" }}>
                <div style={{ fontFamily:"var(--font)", fontSize:"0.72rem", fontWeight:700,
                  color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.10em" }}>
                  Priority Queue Steps
                </div>
                {result.steps.slice(0, stepIdx).map((s,i) => (
                  <motion.div key={i} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                    transition={{ duration:0.18 }}
                    style={{ fontFamily:"monospace", fontSize:"0.72rem",
                      color: s.startsWith("  ") ? "var(--text-muted)" : "var(--teal-dark)",
                      lineHeight:1.6 }}>
                    {s}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formula card */}
          <div style={{ background:"rgba(255,255,255,0.25)", border:"1px solid rgba(255,255,255,0.50)",
            borderRadius:12, padding:"0.85rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <Info className="w-4 h-4" style={{ color:"var(--teal-dark)" }} />
              <span style={{ fontFamily:"var(--font)", fontSize:"0.78rem", fontWeight:700, color:"var(--teal-dark)" }}>
                Weight Formula (config.py)
              </span>
            </div>
            <p style={{ fontFamily:"monospace", fontSize:"0.75rem", color:"var(--text-secondary)", lineHeight:1.7 }}>
              W_edge = α·R̄ + β·d_ij + γ·P_ij<br/>
              α={ALPHA}, β={BETA}, γ={GAMMA}, λ={LAMBDA}<br/>
              W_safe = 1 / (1 − R_avg + ε)
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) { .dijk-layout { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  );
}
