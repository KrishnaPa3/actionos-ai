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
      { title: "Open Tasks", value: openTasks },
      { title: "Due Today", value: dueToday },
      { title: "Overdue", value: overdue },
      { title: "Completed This Week", value: completedWeek },
    ];

    return (
        <div className="statsGrid">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.title}
                className="statCard"
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{
                  y: -4,
                  boxShadow: "0 8px 30px rgba(59, 130, 246, 0.12)",
                  transition: { duration: 0.2 },
                }}
              >
                <p className="statTitle">{stat.title}</p>
                <h2>{stat.value}</h2>
              </motion.div>
            ))}
        </div>
    );
}
