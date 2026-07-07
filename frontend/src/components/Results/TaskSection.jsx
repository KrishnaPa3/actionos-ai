import { useState } from "react";

import EditableCard from "./EditableCard";
import SectionHeader from "./SectionHeader";
import InfoRow from "./InfoRow";
import PriorityBadge from "./PriorityBadge";
import EmptySection from "./EmptySection";
import ActionButtons from "./ActionButtons";
import { useNavigate } from "react-router-dom"; 
import {
    CheckSquare,
    User,
    Calendar,
    Flag
} from "../ui/icons";

export default function TaskSection({

    tasks,
    onCompleteTask,
    onDeleteTask,
    onUpdateTask

}) {

    const [editingTask, setEditingTask] = useState(null);
const navigate = useNavigate();
    const [editedTask, setEditedTask] = useState({});

    if (!tasks || tasks.length === 0) {

        return (

            <section>

                <SectionHeader
                    icon={<CheckSquare size={22} />}
                    title="Tasks"
                />

                <EmptySection
                    icon={<CheckSquare size={42} />}
                    title="No Tasks"
                    description="No actionable tasks were extracted from this meeting."
                />

            </section>

        );

    }

    return (

        <section>

            <SectionHeader
                icon={<CheckSquare size={22} />}
                title={`Tasks (${tasks.length})`}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}
            >

                {tasks.map((task, index) => {

                    const isEditing = editingTask === task.id;

                    return (

                        <EditableCard

                            key={task.id ?? index}

                            title={

                                isEditing ?

                                    (

                                        <input

                                            value={editedTask.title || ""}

                                            onChange={(e) =>

                                                setEditedTask({

                                                    ...editedTask,

                                                    title: e.target.value

                                                })

                                            }

                                            style={{

                                                width: "100%",

                                                fontSize: "22px",

                                                padding: "10px",

                                                borderRadius: "8px",

                                                fontFamily: "'Space Mono', monospace"

                                            }}

                                        />

                                    )

                                    :

                                    (

                                        task.title ||

                                        task.task ||

                                        "Untitled Task"

                                    )

                            }

                            badge={

                                task.status === "completed" && (

                                    <div

                                        style={{

                                            background: "#22c55e",

                                            color: "#fff",

                                            padding: "4px 10px",

                                            borderRadius: "999px",

                                            fontSize: "11px",

                                            fontWeight: 700,

                                            letterSpacing: ".5px",

                                            whiteSpace: "nowrap",

                                            fontFamily: "'Space Mono', monospace"

                                        }}

                                    >

                                        Completed

                                    </div>

                                )

                            }

                            style={{

                                opacity:

                                    task.status === "completed"

                                        ? 0.75

                                        : 1,

                                border:

                                    task.status === "completed"

                                        ? "2px solid #22c55e"

                                        : undefined,

                                boxShadow:

                                    task.status === "completed"

                                        ? "0 0 18px rgba(34,197,94,.25)"

                                        : undefined,

                                transition: "all .35s ease"

                            }}

                            actions={

                                isEditing ?

                                    (

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px"
                                            }}
                                        >

                                            <button

                                                onClick={() => {

                                                    onUpdateTask(

                                                        task.id,

                                                        editedTask

                                                    );

                                                    setEditingTask(null);

                                                }}

                                                style={{

                                                    background: "#16a34a",

                                                    color: "#fff",

                                                    border: "none",

                                                    padding: "8px 16px",

                                                    borderRadius: "8px",

                                                    cursor: "pointer",

                                                    fontFamily: "'Space Mono', monospace"

                                                }}

                                            >

                                                Save

                                            </button>

                                            <button

                                                onClick={() => {

                                                    setEditingTask(null);

                                                }}

                                                style={{

                                                    background: "#6b7280",

                                                    color: "#fff",

                                                    border: "none",

                                                    padding: "8px 16px",

                                                    borderRadius: "8px",

                                                    cursor: "pointer",

                                                    fontFamily: "'Space Mono', monospace"

                                                }}

                                            >

                                                Cancel

                                            </button>

                                        </div>

                                    )

                                    :

                                    (

                                        <ActionButtons

                                            compact

                                            completed={task.status === "completed"}

                                            onEdit={() => {

                                                setEditingTask(task.id);

                                                setEditedTask({

                                                    title: task.title || "",

                                                    owner: task.owner || "",

                                                    due_date: task.due_date || "",

                                                    priority: task.priority || "medium",

                                                    description: task.description || ""

                                                });

                                            }}

                                            onConfirm={() => onCompleteTask(task)}

                                            onDelete={() => onDeleteTask(task)}

                                        />

                                    )

                            }

                        >

                            <InfoRow
                                icon={<User size={16} />}
                                label="Owner"
                                value={

                                    isEditing ?

                                        (

                                            <input

                                                value={editedTask.owner || ""}

                                                onChange={(e) =>

                                                    setEditedTask({

                                                        ...editedTask,

                                                        owner: e.target.value

                                                    })

                                                }

                                                style={{

                                                    width: "100%",

                                                    padding: "8px",

                                                    borderRadius: "8px",

                                                    fontFamily: "'Space Mono', monospace"

                                                }}

                                            />

                                        )

                                        :

                                        (

                                            task.owner || "Unassigned"

                                        )

                                }

                            />

                            <InfoRow

                                icon={<Calendar size={16} />}

                                label="Due"

                                value={

                                    isEditing ?

                                        (

                                            <input

                                                type="datetime-local"

                                                value={

                                                    editedTask.due_date

                                                        ?

                                                        editedTask.due_date.slice(0,16)

                                                        :

                                                        ""

                                                }

                                                onChange={(e)=>

                                                    setEditedTask({

                                                        ...editedTask,

                                                        due_date:e.target.value

                                                    })

                                                }

                                                style={{

                                                    padding:"8px",

                                                    borderRadius:"8px",

                                                    fontFamily:"'Space Mono', monospace"

                                                }}

                                            />

                                        )

                                        :

                                        (

                                            task.due_date

                                                ?

                                                (()=>{

                                                    const due=new Date(task.due_date);

                                                    if(isNaN(due.getTime())){

                                                        return task.due_text || "Not specified";

                                                    }

                                                    const date=due.toLocaleDateString("en-GB");

                                                    const hasTime=

                                                        due.getHours()!==0 ||

                                                        due.getMinutes()!==0;

                                                    return hasTime

                                                        ?

                                                        `${date} • ${due.toLocaleTimeString([],{

                                                            hour:"2-digit",

                                                            minute:"2-digit",

                                                            hour12:true

                                                        })}`

                                                        :

                                                        date;

                                                })()

                                                :

                                                task.due_text || "Not specified"

                                        )

                                }

                            />

                            <InfoRow

                                icon={<Flag size={16} />}

                                label="Priority"

                                value={

                                    isEditing ?

                                        (

                                            <select

                                                value={editedTask.priority}

                                                onChange={(e)=>

                                                    setEditedTask({

                                                        ...editedTask,

                                                        priority:e.target.value

                                                    })

                                                }

                                                style={{

                                                    padding:"8px",

                                                    borderRadius:"8px",

                                                    fontFamily:"'Space Mono', monospace"

                                                }}

                                            >

                                                <option value="high">

                                                    High

                                                </option>

                                                <option value="medium">

                                                    Medium

                                                </option>

                                                <option value="low">

                                                    Low

                                                </option>

                                            </select>

                                        )

                                        :

                                        (

                                            <PriorityBadge

                                                priority={task.priority}

                                            />

                                        )

                                }

                            />

                            <InfoRow

                                icon={<CheckSquare size={16}/>}

                                label="Notes"

                                value={

                                    isEditing ?

                                        (

                                            <textarea

                                                rows={4}

                                                value={editedTask.description || ""}

                                                onChange={(e)=>

                                                    setEditedTask({

                                                        ...editedTask,

                                                        description:e.target.value

                                                    })

                                                }

                                                style={{

                                                    width:"100%",

                                                    padding:"10px",

                                                    borderRadius:"8px",

                                                    resize:"vertical",

                                                    fontFamily:"'Space Mono', monospace"

                                                }}

                                            />

                                        )

                                        :

                                        (

                                            task.description || "No notes"

                                        )

                                }

                            />

                            {

                                task.completed_at &&

                                (

                                    <InfoRow

                                        icon={<CheckSquare size={16}/>}

                                        label="Completed"

                                        value={

                                            (()=>{

                                                const completed=new Date(task.completed_at);

                                                return `${completed.toLocaleDateString("en-GB")} • ${completed.toLocaleTimeString([],{

                                                    hour:"2-digit",

                                                    minute:"2-digit",

                                                    hour12:true

                                                })}`;

                                            })()

                                        }

                                    />

                                )

                            }

                        </EditableCard>

                    );

                })}

            </div>

        </section>

    );

}