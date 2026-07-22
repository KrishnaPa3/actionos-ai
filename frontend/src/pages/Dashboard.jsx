import { useEffect, useState } from "react";
import { motion } from "motion/react";

import DashboardHeader from "./dashboardcomponents/DashboardHeader";
import StatsCards from "./dashboardcomponents/StatsCards";
import TodayFocus from "./dashboardcomponents/TodayFocus";
import RecentMeetings from "./dashboardcomponents/RecentMeetings";
import RecentDecisions from "./dashboardcomponents/RecentDecisions";
import { apiFetch } from "../lib/api";
import "./dashboardcomponents/Dashboard.css";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function Dashboard() {
    const [actions, setActions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [decisions, setDecisions] = useState([]);

    useEffect(() => {
        loadActions();
        loadSessions();
        loadDecisions();
    }, []);

    async function loadActions() {
        try {
            const response = await apiFetch("/actions")

            const data = await response.json();

            setActions(data.actions || []);
        } catch (error) {
            console.error("Failed to load actions:", error);
        }
    }

    async function loadSessions() {
        try {
            const response = await apiFetch("/sessions")

            const data = await response.json();

            setSessions(data.sessions || []);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    }

    async function loadDecisions() {
        try {
    const response = await apiFetch("/decisions");

            const data = await response.json();

            setDecisions(data.decisions || []);
        } catch (error) {
            console.error("Failed to load decisions:", error);
        }
    }

    return (
        <motion.div
          className="dashboardPage"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
            <motion.div variants={sectionVariants}>
              <DashboardHeader />
            </motion.div>

            <motion.div variants={sectionVariants}>
              <StatsCards actions={actions} />
            </motion.div>

            <motion.div variants={sectionVariants} className="dashboardMain">
                <motion.div variants={sectionVariants} className="dashboardLeft">
                    <TodayFocus actions={actions} />
                </motion.div>

                <motion.div variants={sectionVariants} className="dashboardRight">
                    <RecentMeetings sessions={sessions} />
                    <RecentDecisions decisions={decisions} />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
