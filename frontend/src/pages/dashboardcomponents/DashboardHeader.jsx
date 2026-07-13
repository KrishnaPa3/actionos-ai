import "./DashboardHeader.css";

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
            <div className="dashboardGreeting">
                <h1>{greeting}</h1>
                <p>{date}</p>
            </div>
        </div>
    );
}