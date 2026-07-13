import "./StatsCards.css";

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

    return (
        <div className="statsGrid">

            <div className="statCard">
                <p className="statTitle">Open Tasks</p>
                <h2>{openTasks}</h2>
            </div>

            <div className="statCard">
                <p className="statTitle">Due Today</p>
                <h2>{dueToday}</h2>
            </div>

            <div className="statCard">
                <p className="statTitle">Overdue</p>
                <h2>{overdue}</h2>
            </div>

            <div className="statCard">
                <p className="statTitle">Completed This Week</p>
                <h2>{completedWeek}</h2>
            </div>

        </div>
    );
}