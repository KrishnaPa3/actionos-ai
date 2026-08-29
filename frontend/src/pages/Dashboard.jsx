import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";

import DashboardHeader from "./dashboardcomponents/DashboardHeader";
import StatsCards from "./dashboardcomponents/StatsCards";
import TodayFocus from "./dashboardcomponents/TodayFocus";
import RecentMeetings from "./dashboardcomponents/RecentMeetings";
import RecentDecisions from "./dashboardcomponents/RecentDecisions";
import Loading from "../components/ui/Loading";
import Button from "../components/ui/Button";
import { RefreshCw } from "../components/ui/icons";
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

    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const retry = useCallback(() => {
        setFailed(false);
        setLoading(true);
        setAttempt((n) => n + 1);
    }, []);

    // Nothing renders until every panel has its data. Previously the page
    // painted immediately with empty arrays and the content popped in.
    useEffect(() => {
        let alive = true;

        async function loadAll() {
            try {
                const [actionsRes, sessionsRes, decisionsRes] = await Promise.all([
                    apiFetch("/actions"),
                    apiFetch("/sessions"),
                    apiFetch("/decisions"),
                ]);

                if (!actionsRes.ok || !sessionsRes.ok || !decisionsRes.ok) {
                    throw new Error("Dashboard request failed");
                }

                const [actionsData, sessionsData, decisionsData] = await Promise.all([
                    actionsRes.json(),
                    sessionsRes.json(),
                    decisionsRes.json(),
                ]);

                if (!alive) return;

                setActions(actionsData.actions || []);
                setSessions(sessionsData.sessions || []);
                setDecisions(decisionsData.decisions || []);
                setLoading(false);
            } catch (error) {
                console.error("Failed to load the dashboard:", error);

                if (!alive) return;

                setFailed(true);
                setLoading(false);
            }
        }

        loadAll();

        return () => {
            alive = false;
        };
    }, [attempt]);

    if (loading) {
        return (
            <Loading
              label="Gathering your meetings"
              hint="The API sleeps when it is idle, so the first load after a quiet spell takes a few seconds."
            />
        );
    }

    if (failed) {
        return (
            <div className="dashboardError">
                <h2>Could not reach the backend</h2>
                <p>
                    Nothing loaded, so rather than show you an empty dashboard: the API did
                    not answer. It may still be starting up.
                </p>
                <Button icon={<RefreshCw size={17} />} onClick={retry}>
                    Try again
                </Button>
            </div>
        );
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
