import StatCard from "./StatCard";

import {
  ClipboardList,
  CalendarClock,
  TriangleAlert,
  CheckCircle2,
} from "../ui/icons";

export default function StatsSection() {
  const stats = [
    {
      title: "Open Tasks",
      value: 12,
      description: "Awaiting completion",
      icon: ClipboardList,
      variant: "info",
    },
    {
      title: "Due Today",
      value: 4,
      description: "Requires attention",
      icon: CalendarClock,
      variant: "warning",
    },
    {
      title: "High Priority",
      value: 3,
      description: "Immediate focus",
      icon: TriangleAlert,
      variant: "danger",
    },
    {
      title: "Completed This Week",
      value: 21,
      description: "Great progress",
      icon: CheckCircle2,
      variant: "success",
    },
  ];

  return (
    <section className="stats-section">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          icon={stat.icon}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          variant={stat.variant}
        />
      ))}
    </section>
  );
}