import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

import "./TodayFocus.css";

const taskVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut", delay: i * 0.04 },
  }),
};

export default function TodayFocus({ actions }) {

    const navigate = useNavigate();

    const today = new Date();

    const startToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);

    const tomorrow = new Date(endToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    function getPriorityRank(task) {

        if (task.due_date) {

            const due = new Date(task.due_date);

            if (due < startToday) return 0;
            if (due < endToday) return 1;
            if (due < tomorrow) return 2;

        }

        if (task.priority === "high") return 3;
        if (task.priority === "medium") return 4;

        return 5;

    }

    function getDueLabel(task) {

        if (!task.due_date)
            return "No due date";

        const due = new Date(task.due_date);

        if (due < startToday)
            return "Overdue";

        if (due < endToday)
            return "Today";

        if (due < tomorrow)
            return "Tomorrow";

        return due.toLocaleDateString("en-GB");

    }

    const focusedTasks = actions

        .filter(task => task.status === "pending")

        .sort((a, b) => {

            const rank = getPriorityRank(a) - getPriorityRank(b);

            if (rank !== 0)
                return rank;

            const aDue = a.due_date
                ? new Date(a.due_date)
                : new Date(8640000000000000);

            const bDue = b.due_date
                ? new Date(b.due_date)
                : new Date(8640000000000000);

            return aDue - bDue;

        })

        .slice(0, 10);

    return (

        <div className="todayFocusCard">

            <div className="todayFocusHeader">

                <h2>Today's Focus</h2>

                <span>{focusedTasks.length} Tasks</span>

            </div>

            <div className="todayFocusBody">

                {focusedTasks.length === 0 ? (

                    <div className="emptyFocus">

                        🎉 Nothing pending.

                    </div>

                ) : (

                    focusedTasks.map((task, i) => (

                        <motion.div
                            key={task.id}
                            className="focusTask"
                            role="button"
                            tabIndex={0}
                            custom={i}
                            variants={taskVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover={{
                              x: 4,
                              transition: { duration: 0.15 },
                            }}
                            onClick={() =>
                                navigate(
                                    `/results/${task.session_id}`,
                                    {
                                        state: {
                                            scrollTo: "tasks",
                                        },
                                    }
                                )
                            }
                            onKeyDown={(e) => {

                                if (
                                    e.key === "Enter" ||
                                    e.key === " "
                                ) {

                                    navigate(
                                        `/results/${task.session_id}`,
                                        {
                                            state: {
                                                scrollTo: "tasks",
                                            },
                                        }
                                    );

                                }

                            }}
                        >

                            <div className="focusTaskTop">

                                <div className="taskTitleGroup">

                                    <span
                                        className={`priorityDot ${task.priority}`}
                                    />

                                    <h3>{task.title}</h3>

                                </div>

                                <div className="taskRight">

                                    <span
                                        className={`priorityBadge ${task.priority}`}
                                    >
                                        {task.priority}
                                    </span>

                                    <ChevronRight
                                        size={18}
                                        className="taskArrow"
                                    />

                                </div>

                            </div>

                            <div className="taskMeta">

                                <span>

                                    <strong>Due:</strong>{" "}
                                    {getDueLabel(task)}

                                </span>

                                <span>

                                    <strong>Owner:</strong>{" "}
                                    {task.owner || "Unknown"}

                                </span>

                            </div>

                            <small>

                                {task.sessions?.meeting_name ||
                                    "Unknown Meeting"}

                            </small>

                        </motion.div>

                    ))

                )}

            </div>

        </div>

    );

}
