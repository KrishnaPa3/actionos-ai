export default function DashboardHeader() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <h1 className="dashboard-title">Action Center</h1>

        <p className="dashboard-subtitle">
          Manage tasks, reminders and action plans extracted from your meetings.
        </p>
      </div>

      <div className="dashboard-header-right">
        <span className="dashboard-date">{today}</span>
      </div>
    </header>
  );
}