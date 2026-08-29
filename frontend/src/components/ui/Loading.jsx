import { motion } from "motion/react";
import "./Loading.css";

const BARS = [0, 1, 2, 3, 4, 5, 6];

/* The level meter from the brand mark, but bouncing. Used everywhere the app
   is waiting on the backend, so the wait always looks like the same thing. */

export default function Loading({ label = "Loading", hint, full = true }) {
  return (
    <div className={`aosLoading${full ? " isFull" : ""}`} role="status" aria-live="polite">
      <div className="aosLoadingStage">
        <span className="aosLoadingGlow" aria-hidden="true" />

        <div className="aosBars" aria-hidden="true">
          {BARS.map((i) => (
            <motion.span
              key={i}
              animate={{ scaleY: [0.22, 1, 0.22] }}
              transition={{
                duration: 0.95,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.085,
              }}
            />
          ))}
        </div>
      </div>

      <motion.p
        className="aosLoadingLabel"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {label}
        <span className="aosDots" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.i
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.18,
              }}
            />
          ))}
        </span>
      </motion.p>

      {hint && (
        <motion.p
          className="aosLoadingHint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          {hint}
        </motion.p>
      )}
    </div>
  );
}
