import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DijkstraViz } from "./DijkstraViz";
import { DiscreteMathViz } from "./DiscreteMathViz";

type VizSection = "dijkstra" | "discretemath";

export function VisualizationTab() {
  const [section, setSection] = useState<VizSection>("dijkstra");

  const tabs: { id: VizSection; label: string; emoji: string }[] = [
    { id: "dijkstra",    label: "Dijkstra Pathfinder",    emoji: "🗺️" },
    { id: "discretemath",label: "Discrete Math Concepts", emoji: "🔢" },
  ];

  return (
    <motion.div
      initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
      style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}
    >
      {/* Section selector */}
      <div style={{ display:"flex", justifyContent:"center" }}>
        <div className="viz-inner-tabs" style={{ maxWidth:520, width:"100%" }}>
          {tabs.map(t => (
            <motion.button
              key={t.id}
              className={`viz-inner-tab${section===t.id ? " active" : ""}`}
              onClick={() => setSection(t.id)}
              whileTap={{ scale:0.96 }}
            >
              {t.emoji} {t.label}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {section === "dijkstra" ? (
          <motion.div key="dijkstra"
            initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}>
            <DijkstraViz />
          </motion.div>
        ) : (
          <motion.div key="discretemath"
            initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}>
            <DiscreteMathViz />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
