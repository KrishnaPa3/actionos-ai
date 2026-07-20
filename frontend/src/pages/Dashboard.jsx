import { useEffect, useState } from "react";

import DashboardHeader from "./dashboardcomponents/DashboardHeader";
import StatsCards from "./dashboardcomponents/StatsCards";
import TodayFocus from "./dashboardcomponents/TodayFocus";
import RecentMeetings from "./dashboardcomponents/RecentMeetings";
import RecentDecisions from "./dashboardcomponents/RecentDecisions";
import { apiFetch } from "../lib/api";
import "./dashboardcomponents/Dashboard.css";

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
        <div className="dashboardPage">
            <DashboardHeader />

            <StatsCards actions={actions} />

            <div className="dashboardMain">
                <div className="dashboardLeft">
                    <TodayFocus actions={actions} />
                </div>

                <div className="dashboardRight">
                    <RecentMeetings sessions={sessions} />

                    <RecentDecisions decisions={decisions} />
                </div>
            </div>
        </div>
    );
}