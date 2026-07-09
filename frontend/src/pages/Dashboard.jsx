import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsSection from "../components/dashboard/StatsSection";

import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <DashboardHeader />

      <StatsSection />
    </div>
  );
}