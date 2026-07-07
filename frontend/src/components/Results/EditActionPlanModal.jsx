import { useEffect, useState } from "react";

export default function EditActionPlanModal({
    open,
    actionPlan,
    onCancel,
    onSave
}) {

    const [editedPlan, setEditedPlan] = useState(null);

    useEffect(() => {

        if (actionPlan) {
            setEditedPlan(structuredClone(actionPlan));
        }

    }, [actionPlan]);

    if (!open || !editedPlan) return null;

    function updateStep(index, field, value) {

        const updated = structuredClone(editedPlan);

        updated.steps[index][field] = value;

        setEditedPlan(updated);

    }

    function addStep() {

        setEditedPlan({

            ...editedPlan,

            steps: [

                ...editedPlan.steps,

                {
                    step: "",
                    owner: ""
                }

            ]

        });

    }

    function removeStep(index) {

        if (editedPlan.steps.length <= 2) {

            alert("An Action Plan must contain at least 2 steps.");

            return;

        }

        const updated = structuredClone(editedPlan);

        updated.steps.splice(index, 1);

        setEditedPlan(updated);

    }

    function handleSave() {

        if (!editedPlan.objective.trim()) {

            alert("Objective cannot be empty.");

            return;

        }

        onSave(editedPlan);

    }

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999
            }}
        >

            <div
                style={{
                    width: "650px",
                    maxHeight: "85vh",
                    overflowY: "auto",
                    background: "#1e293b",
                    borderRadius: "12px",
                    padding: "24px"
                }}
            >

                <h2>Edit Action Plan</h2>

                <label>

                    Objective

                    <input
                        value={editedPlan.objective}
                        onChange={(e) =>
                            setEditedPlan({
                                ...editedPlan,
                                objective: e.target.value
                            })
                        }
                        style={{
                            width: "100%",
                            marginTop: "8px",
                            marginBottom: "24px",
                            padding: "10px"
                        }}
                    />

                </label>

                {editedPlan.steps.map((step, index) => (

                    <div
                        key={index}
                        style={{
                            border: "1px solid rgba(255,255,255,0.08)",
                            padding: "16px",
                            borderRadius: "10px",
                            marginBottom: "18px"
                        }}
                    >

                        <h4>

                            Step {index + 1}

                        </h4>

                        <input
                            placeholder="Step"
                            value={step.step}
                            onChange={(e) =>
                                updateStep(
                                    index,
                                    "step",
                                    e.target.value
                                )
                            }
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "12px"
                            }}
                        />

                        <input
                            placeholder="Owner"
                            value={step.owner || ""}
                            onChange={(e) =>
                                updateStep(
                                    index,
                                    "owner",
                                    e.target.value
                                )
                            }
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "12px"
                            }}
                        />

                        <button
                            onClick={() =>
                                removeStep(index)
                            }
                        >
                            🗑 Remove Step
                        </button>

                    </div>

                ))}

                <button
                    onClick={addStep}
                    style={{
                        marginBottom: "24px"
                    }}
                >
                    + Add Step
                </button>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px"
                    }}
                >

                    <button onClick={onCancel}>

                        Cancel

                    </button>

                    <button onClick={handleSave}>

                        Save

                    </button>

                </div>

            </div>

        </div>

    );

}