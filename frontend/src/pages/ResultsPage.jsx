import "./ResultsPage.css";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import EditItemModal from "../components/EditItemModal";
import EditActionPlanModal from "../components/results/EditActionPlanModal";
 
import {
  FileText,
  Pencil,
  Save,
} from "../components/ui/icons";

import SummarySection from "../components/results/SummarySection";
import TaskSection from "../components/results/TaskSection";
import ActionPlanSection from "../components/results/ActionPlanSection";
import DecisionSection from "../components/results/DecisionSection";
import RiskSection from "../components/results/RiskSection";
import DeleteItemModal from "../components/DeleteItemModal";

export default function ResultsPage() {

const { sessionId } = useParams();
const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
const [toast, setToast] = useState({
    message: "",
    type: "success"
});  const [editing, setEditing] = useState(false);
  const [meetingName, setMeetingName] = useState("");
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [risks, setRisks] = useState([]);
  const [riskToEdit, setRiskToEdit] = useState(null);
const [riskToDelete, setRiskToDelete] = useState(null);
const [decisions, setDecisions] = useState([]);
const [decisionToEdit, setDecisionToEdit] = useState(null);
const [decisionToDelete, setDecisionToDelete] = useState(null);
const [deletingActionPlan, setDeletingActionPlan] = useState(false);
const [editingActionPlan, setEditingActionPlan] = useState(null);
const [editingActionPlanIndex, setEditingActionPlanIndex] = useState(null);

  // -------------------------
  // Load Meeting
  // -------------------------

  async function loadMeeting() {

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/session/${sessionId}`
      );

      const actionsResponse = await fetch(
        `http://127.0.0.1:8000/session/${sessionId}/actions`
      );
      const risksResponse = await fetch(
    `http://127.0.0.1:8000/session/${sessionId}/risks`
);

      const actionsData = await actionsResponse.json();
      const risksData = await risksResponse.json();
      const decisionsResponse = await fetch(
    `http://127.0.0.1:8000/session/${sessionId}/decisions`
);

const decisionsData = await decisionsResponse.json();

setDecisions(decisionsData.decisions);

      setActions(actionsData.actions);
      setRisks(risksData.risks);

      const data = await response.json();

      setMeeting(data);
      setMeetingName(data.meeting_name);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }

  // -------------------------
  // Load on page open
  // -------------------------
async function completeTask(task) {

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/actions/${task.id}/complete`,
            {
                method: "PATCH",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update task");
        }

        await loadMeeting();

        setToast({
            message: "Task completed",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    } catch (err) {

        console.error(err);

    }

}

async function resolveRisk(risk) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/risks/${risk.id}/resolve`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to resolve risk");

        }

        await loadMeeting();

        setToast({
            message: "Risk status updated",
            type: "warning"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function acceptDecision(decision) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/decisions/${decision.id}/accept`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to accept decision");

        }

        await loadMeeting();

        setToast({
            message: "Decision marked as Agreed",
            type: "info"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function rejectDecision(decision) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/decisions/${decision.id}/reject`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to reject decision");

        }

        await loadMeeting();

        setToast({
            message: "Decision marked as Disagreed",
            type: "info"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function deleteTask() {

    if (!taskToDelete) return;

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/actions/${taskToDelete.id}`,

            {
                method: "DELETE"
            }

        );

        if (!response.ok) {
            throw new Error("Failed to delete task");
        }

        setTaskToDelete(null);

        await loadMeeting();

        setToast({
            message: "Task deleted",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    } catch (err) {

        console.error(err);

    }

}
async function deleteRisk() {

    if (!riskToDelete) return;

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/risks/${riskToDelete.id}`,

            {

                method: "DELETE"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to delete risk");

        }

        setRiskToDelete(null);

        await loadMeeting();

        setToast({
            message: "Risk deleted",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function deleteDecision() {

    if (!decisionToDelete) return;

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/decisions/${decisionToDelete.id}`,

            {

                method: "DELETE"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to delete decision");

        }

        setDecisionToDelete(null);

        await loadMeeting();

        setToast({
            message: "Decision deleted",
            type: "info"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function handleDeleteActionPlan(index) {

    if (deletingActionPlan) return;

    const confirmed = window.confirm(
        "Delete this Action Plan?"
    );

    if (!confirmed) return;

    try {

        setDeletingActionPlan(true);

        const response = await fetch(
            `http://127.0.0.1:8000/session/${meeting.id}/action-plan/${index}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Delete failed"
            );
        }

        await loadMeeting();

        setToast({
            message: "Action Plan deleted",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    } catch (err) {

        console.error(err);

        alert(err.message);

    } finally {

        setDeletingActionPlan(false);

    }

}
async function updateTask(taskId, updatedTask) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/actions/${taskId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(updatedTask)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update task");

        }

        await loadMeeting();

        setToast({
            message: "Task updated",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function updateRisk(riskId, updatedRisk) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/risks/${riskId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(updatedRisk)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update risk");

        }

        await loadMeeting();

        setToast({
            message: "Risk updated",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}

async function updateDecision(decisionId, updatedDecision) {

    try {

        const response = await fetch(

            `http://127.0.0.1:8000/decisions/${decisionId}`,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(updatedDecision)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update decision");

        }

        await loadMeeting();

        setToast({
            message: "Decision updated",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    }

    catch (err) {

        console.error(err);

    }

}
useEffect(() => {

    async function initialize() {

        // If a meeting ID exists, load it normally
        if (sessionId) {
            loadMeeting();
            return;
        }

        // Otherwise get the newest meeting
        try {

            const response = await fetch(
                "http://127.0.0.1:8000/sessions"
            );

            const data = await response.json();

            if (data.sessions && data.sessions.length > 0) {

                navigate(
                    `/results/${data.sessions[0].id}`,
                    { replace: true }
                );

            } else {

                setLoading(false);

            }

        } catch (err) {

            console.error(err);
            setLoading(false);

        }

    }

    initialize();

}, [sessionId]);

async function handleSaveActionPlan(updatedPlan) {

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/session/${meeting.id}/action-plan/${editingActionPlanIndex}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedPlan)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Update failed");
        }

        setEditingActionPlan(null);
        setEditingActionPlanIndex(null);

        await loadMeeting();

        setToast({
            message: "Action Plan updated",
            type: "success"
        });

        setTimeout(() => {

            setToast({
                message: "",
                type: "success"
            });

        }, 3000);

    } catch (err) {

        console.error(err);

        alert(err.message);

    }

}
  // -------------------------
  // Rename Meeting
  // -------------------------

  async function saveMeetingName() {

    try {

      const response = await fetch(

        `http://127.0.0.1:8000/session/${sessionId}/rename`,

        {

          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            meeting_name: meetingName,
          }),

        }

      );

      const data = await response.json();

      setMeeting(data.session);

      setEditing(false);

    } catch (err) {

      console.error(err);

    }

  }

  if (loading) {

    return <h2>Loading meeting...</h2>;

  }

  if (!meeting) {

    return <h2>Meeting not found.</h2>;

  }

  return (

    <div
      style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "0 20px",
      }}
    >

      <PageHeader

        icon={<FileText size={30} />}

        title={

          editing ? (

            <input

              value={meetingName}

              onChange={(e) => setMeetingName(e.target.value)}

              style={{
                fontSize: "28px",
                padding: "10px",
                width: "450px",
              }}

            />

          ) : (

            meeting.meeting_name

          )

        }

        subtitle={

          meeting.created_at
            ? new Date(meeting.created_at).toLocaleString()
            : ""

        }

        right={

          editing ? (

            <Button

              variant="success"

              icon={<Save size={18} />}

              onClick={saveMeetingName}

            >

              Save

            </Button>

          ) : (

            <Button

              variant="outline"

              icon={<Pencil size={18} />}

              onClick={() => setEditing(true)}

            >

              Rename

            </Button>

          )

        }

      />

      <Card style={{ marginBottom: "24px" }}>

        <SummarySection
          summary={meeting.summary}
        />

      </Card>

      <Card style={{ marginBottom: "24px" }}>

        <TaskSection
    tasks={actions}
    onCompleteTask={completeTask}
    onDeleteTask={setTaskToDelete}
    onUpdateTask={updateTask}
/>
      </Card>

     

   <Card style={{ marginBottom: "24px" }}>

   <ActionPlanSection
    actionPlans={meeting.action_plan}
    onEdit={(index) => {

    setEditingActionPlanIndex(index);

    setEditingActionPlan(
        structuredClone(meeting.action_plan[index])
    );

}}
    onDelete={handleDeleteActionPlan}
/>

</Card>
      <Card style={{ marginBottom: "24px" }}>

       <DecisionSection

    decisions={decisions}

    onAcceptDecision={acceptDecision}

    onRejectDecision={rejectDecision}

    onEditDecision={setDecisionToEdit}

    onDeleteDecision={setDecisionToDelete}

/>

      </Card>

      <Card>

        <RiskSection
    risks={risks}
    onResolveRisk={resolveRisk}
    onUpdateRisk={updateRisk}
    onDeleteRisk={setRiskToDelete}
    onEditRisk={setRiskToEdit}
/>

      </Card>
<DeleteItemModal
    open={taskToDelete !== null}
    item={taskToDelete}
    itemType="Task"
    onCancel={() => setTaskToDelete(null)}
    onConfirm={deleteTask}
/>
<DeleteItemModal
    open={riskToDelete !== null}
    item={riskToDelete}
    itemType="Risk"
    onCancel={() => setRiskToDelete(null)}
    onConfirm={deleteRisk}
/>
<DeleteItemModal
    open={decisionToDelete !== null}
    item={decisionToDelete}
    itemType="Decision"
    onCancel={() => setDecisionToDelete(null)}
    onConfirm={deleteDecision}
/>
<EditItemModal
    open={riskToEdit !== null}
    title="Edit Risk"
    item={riskToEdit}
    fields={[
        {
            name: "title",
            label: "Title"
        },
        {
            name: "impact",
            label: "Impact",
            type: "textarea"
        },
        {
            name: "mitigation",
            label: "Mitigation",
            type: "textarea"
        },
        {
            name: "risk_score",
            label: "Risk Score",
            type: "number"
        }
    ]}
    onCancel={() => setRiskToEdit(null)}
    onSave={async (updatedRisk) => {

        await updateRisk(
            riskToEdit.id,
            updatedRisk
        );

        setRiskToEdit(null);

    }}
/>
<EditItemModal
    open={decisionToEdit !== null}
    title="Edit Decision"
    item={decisionToEdit}
    fields={[
        {
            name: "title",
            label: "Title"
        },
        {
            name: "reason",
            label: "Reason",
            type: "textarea"
        }
    ]}
    onCancel={() => setDecisionToEdit(null)}
    onSave={async (updatedDecision) => {

        await updateDecision(
            decisionToEdit.id,
            {
                ...decisionToEdit,
                ...updatedDecision,
                confidence: decisionToEdit.confidence
            }
        );

        setDecisionToEdit(null);

    }}
/>
<EditActionPlanModal
    open={editingActionPlan !== null}
    actionPlan={editingActionPlan}
    onCancel={() => {
        setEditingActionPlan(null);
        setEditingActionPlanIndex(null);
    }}
    onSave={handleSaveActionPlan}
/>
{toast.message && (    
    <div
        style={{
    position: "fixed",
    bottom: "24px",
    right: "24px",

    background:
        toast.type === "success"
            ? "#16a34a"
            : toast.type === "warning"
            ? "#ea580c"
            : "#2563eb",

    color: "#fff",

    padding: "12px 18px",

    borderRadius: "10px",

    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",

    fontFamily: "'Space Mono', monospace",

    fontSize: "14px",

    fontWeight: 600,

    zIndex: 9999,

    animation: "fadeIn 0.3s ease",
}}
    >
        {toast.message}
    </div>
)}
    </div>

  );

}
