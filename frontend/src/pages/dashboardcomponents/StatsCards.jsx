import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import "./StatsCards.css";

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.08 },
  }),
};

export default function StatsCards({ actions }) {

    const today = new Date();

    const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const endOfToday = new Date(startOfToday);

    endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday);

    startOfWeek.setDate(
        startOfWeek.getDate() - startOfWeek.getDay()
    );

    const openTasks = actions.filter(
        task => task.status === "pending"
    ).length;

    const dueToday = actions.filter(task => {

        if (!task.due_date || task.status !== "pending")
            return false;

        const due = new Date(task.due_date);

        return due >= startOfToday && due < endOfToday;

    }).length;

    const overdue = actions.filter(task => {

        if (!task.due_date || task.status !== "pending")
            return false;

        return new Date(task.due_date) < startOfToday;

    }).length;

    const completedWeek = actions.filter(task => {

        if (!task.completed_at)
            return false;

        return new Date(task.completed_at) >= startOfWeek;

    }).length;

    const stats = [
      { title: "Open Tasks", value: openTasks, tint: "#3B82F6" },
      { title: "Due Today", value: dueToday, tint: "#F59E0B" },
      { title: "Overdue", value: overdue, tint: "#EF4444" },
      { title: "Completed This Week", value: completedWeek, tint: "#22C55E" },
    ];

    // One wash of colour for the whole row, which travels to whichever card
    // is selected — rather than four of them sitting lit up at once.
    const [selected, setSelected] = useState(0);
    const [wash, setWash] = useState(null);

    const gridRef = useRef(null);
    const cardRefs = useRef({});

    useLayoutEffect(() => {
        function place() {
            const el = cardRefs.current[selected];

            if (!el) return;

            setWash({
                left: el.offsetLeft,
                top: el.offsetTop,
                width: el.offsetWidth,
                height: el.offsetHeight,
            });
        }

        place();

        // Fonts and the grid settle a beat after mount.
        const settle = window.setTimeout(place, 260);

        window.addEventListener("resize", place);

        return () => {
            window.clearTimeout(settle);
            window.removeEventListener("resize", place);
        };
    }, [selected]);

    const tint = stats[selected].tint;

    return (
        <div className="statsGrid" ref={gridRef}>

            {wash && (
                <span
                    className="statWash"
                    aria-hidden="true"
                    style={{
                        transform: `translate(${wash.left}px, ${wash.top}px)`,
                        width: `${wash.width}px`,
                        height: `${wash.height}px`,
                        background: `radial-gradient(120% 120% at 82% 8%, ${tint}, transparent 68%)`,
                    }}
                />
            )}

            {stats.map((stat, i) => (
              <motion.button
                type="button"
                key={stat.title}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={`statCard${i === selected ? " isSelected" : ""}`}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                style={i === selected ? { borderColor: `${stat.tint}66` } : undefined}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.2 },
                }}
              >
                <h2>{stat.value}</h2>
                <p className="statTitle">{stat.title}</p>
              </motion.button>
            ))}
        </div>
    );
}
