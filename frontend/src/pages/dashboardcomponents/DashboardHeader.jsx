import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Mic } from "../../components/ui/icons";
import Button from "../../components/ui/Button";
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
    const navigate = useNavigate();
    const { user } = useAuth();

    const hour = new Date().getHours();

    let greeting = "Good evening";

    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    const firstName = (user?.user_metadata?.username || "").split(" ")[0];

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
                <motion.p variants={itemVariants} className="eyebrow">{date}</motion.p>
                <motion.h1 variants={itemVariants}>
                    {firstName ? `${greeting}, ${firstName}` : greeting}
                </motion.h1>
            </motion.div>

            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="dashboardHeaderAction"
            >
                <Button
                  size="lg"
                  icon={<Mic size={18} />}
                  onClick={() => navigate("/record")}
                >
                    Record a meeting
                </Button>
            </motion.div>
        </div>
    );
}
