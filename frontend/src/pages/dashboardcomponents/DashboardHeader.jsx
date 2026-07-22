import { motion } from "motion/react";
import "./DashboardHeader.css";

const greetingVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function DashboardHeader() {
    const hour = new Date().getHours();

    let greeting = "Good Evening";

    if (hour < 12) greeting = "Good Morning";
    else if (hour < 17) greeting = "Good Afternoon";

    const date = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="dashboardHeader">
            <motion.div
              className="dashboardGreeting"
              variants={greetingVariants}
              initial="hidden"
              animate="visible"
            >
                <motion.h1 variants={itemVariants}>{greeting}</motion.h1>
                <motion.p variants={itemVariants}>{date}</motion.p>
            </motion.div>
        </div>
    );
}
