import "./ResultsPage.css";
import {
    useParams,
    useNavigate,
    useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";

import { apiFetch, readErrorDetail } from "../lib/api";

// Human names for the sync targets, used in error messages.
const SYNC_APP_LABEL = { google: "Google Calendar", notion: "Notion", slack: "Slack" };


import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import EditItemModal from "../components/EditItemModal";
import EditActionPlanModal from "../components/results/EditActionPlanModal";
import TranscriptSection from "../components/results/TranscriptSection";

import { motion } from "motion/react";
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
    });

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        window.setTimeout(() => {
            setToast({ message: "", type });
        }, 3000);
    };

    const [editing, setEditing] = useState(false);
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

    const [syncingTaskId, setSyncingTaskId] = useState(null);
    const [notionSyncMap, setNotionSyncMap] = useState({});
    const [googleSyncMap, setGoogleSyncMap] = useState({});

    const location = useLocation();

    // -------------------------
    // Load Meeting
    // -------------------------

    async function loadMeeting() {

        try {

            const [
                response,
                actionsResponse,
                risksResponse,
                decisionsResponse
            ] = await Promise.all([
                apiFetch(`/session/${sessionId}`),
                apiFetch(`/session/${sessionId}/actions`),
                apiFetch(`/session/${sessionId}/risks`),
                apiFetch(`/session/${sessionId}/decisions`)
            ]);

            const actionsData = await actionsResponse.json();
            const risksData = await risksResponse.json();
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

            const response = await apiFetch(
    `/actions/${task.id}/complete`,
    {
        method: "PATCH",
    }
);

if (!response.ok) {
    throw new Error("Failed to update task");
}

const data = await response.json();

setActions(prev =>
    prev.map(action =>
        action.id === data.action.id
            ? data.action
            : action
    )
);

            // Tell the Navbar that reminders changed
            window.dispatchEvent(
                new Event("remindersUpdated")
            );

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

        const response = await apiFetch(

            `/risks/${risk.id}/resolve`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to resolve risk");

        }

        const data = await response.json();

        setRisks(prev =>
            prev.map(risk =>
                risk.id === data.risk.id
                    ? data.risk
                    : risk
            )
        );

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

        const response = await apiFetch(

            `/decisions/${decision.id}/accept`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to accept decision");

        }

        const data = await response.json();

        setDecisions(prev =>
            prev.map(decision =>
                decision.id === data.decision.id
                    ? data.decision
                    : decision
            )
        );

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

        const response = await apiFetch(

            `/decisions/${decision.id}/reject`,

            {

                method: "PATCH"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to reject decision");

        }

        const data = await response.json();

        setDecisions(prev =>
            prev.map(decision =>
                decision.id === data.decision.id
                    ? data.decision
                    : decision
            )
        );

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

        const response = await apiFetch(

            `/actions/${taskToDelete.id}`,

            {
                method: "DELETE"
            }

        );

        if (!response.ok) {
            throw new Error("Failed to delete task");
        }

        setActions(prev =>
            prev.filter(action => action.id !== taskToDelete.id)
        );

        setTaskToDelete(null);

        // Tell the Navbar that reminders changed
        window.dispatchEvent(new Event("remindersUpdated"));

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

        const response = await apiFetch(

            `/risks/${riskToDelete.id}`,

            {

                method: "DELETE"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to delete risk");

        }

        setRisks(prev =>
            prev.filter(risk => risk.id !== riskToDelete.id)
        );

        setRiskToDelete(null);

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

        const response = await apiFetch(

            `/decisions/${decisionToDelete.id}`,

            {

                method: "DELETE"

            }

        );

        if (!response.ok) {

            throw new Error("Failed to delete decision");

        }

        setDecisions(prev =>
            prev.filter(
                decision => decision.id !== decisionToDelete.id
            )
        );

        setDecisionToDelete(null);

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

        const response = await apiFetch(
            `/session/${meeting.id}/action-plan/${index}`,
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

        setMeeting(prev => ({
            ...prev,
            action_plan: prev.action_plan.filter(
                (_, i) => i !== index
            )
        }));

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

        const response = await apiFetch(

            `/actions/${taskId}`,

            {

                method: "PATCH",

                body: JSON.stringify(updatedTask)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update task");

        }

        const data = await response.json();

        setActions(prev =>
            prev.map(action =>
                action.id === data.action.id
                    ? data.action
                    : action
            )
        );

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

        const response = await apiFetch(

            `/risks/${riskId}`,

            {

                method: "PATCH",

                body: JSON.stringify(updatedRisk)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update risk");

        }

        const data = await response.json();

        setRisks(prev =>
            prev.map(risk =>
                risk.id === data.risk.id
                    ? data.risk
                    : risk
            )
        );

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

        const response = await apiFetch(

            `/decisions/${decisionId}`,

            {

                method: "PATCH",

                body: JSON.stringify(updatedDecision)

            }

        );

        if (!response.ok) {

            throw new Error("Failed to update decision");

        }

        const data = await response.json();

        setDecisions(prev =>
            prev.map(decision =>
                decision.id === data.decision.id
                    ? data.decision
                    : decision
            )
        );

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

            const response = await apiFetch(
                "/sessions"
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

}, [sessionId, navigate]);

useEffect(() => {

    if (!meeting) return;

    if (location.state?.scrollTo) {

        const section = document.getElementById(
            location.state.scrollTo
        );

        if (section) {

            setTimeout(() => {

                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });

            }, 150);

            navigate(location.pathname, {
                replace: true,
                state: {},
            });

        }

    }

}, [meeting, location, navigate]);

async function handleSaveActionPlan(updatedPlan) {

    try {

        const response = await apiFetch(
            `/session/${meeting.id}/action-plan/${editingActionPlanIndex}`,
            {
                method: "PUT",
                body: JSON.stringify(updatedPlan)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Update failed");
        }

        setMeeting(prev => ({
            ...prev,
            action_plan: prev.action_plan.map((plan, i) =>
                i === editingActionPlanIndex
                    ? (data.action_plan ?? data)
                    : plan
            )
        }));

        setEditingActionPlan(null);
        setEditingActionPlanIndex(null);

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

        const response = await apiFetch(

            `/session/${sessionId}/rename`,

            {

                method: "PATCH",

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

        <TranscriptSection
          transcript={meeting.speaker_transcript}
        />

      </Card>

      <div id="tasks">

        <Card style={{ marginBottom: "24px" }}>

          <TaskSection
            tasks={actions}
            onCompleteTask={completeTask}
            onDeleteTask={setTaskToDelete}
            onUpdateTask={updateTask}
            onSyncTask={async (taskId, app) => {
              setSyncingTaskId(taskId);
              try {
                const endpoint = app === "google"
                  ? "/integrations/google/sync-task"
                  : app === "notion"
                    ? "/integrations/notion/sync-task"
                    : "/integrations/slack/sync-task";
                const response = await apiFetch(endpoint, {
                  method: "POST",
                  body: JSON.stringify({ action_id: taskId }),
                });
                // See TaskRow: a non-2xx here used to be swallowed silently.
                if (!response.ok) {
                  throw new Error(await readErrorDetail(response));
                }
                const data = await response.json();
                if (data.success) {
                  if (app === "google") {
                    setGoogleSyncMap((prev) => ({
                      ...prev,
                      [taskId]: {
                        synced: true,
                        eventUrl: data.event_url || "",
                      },
                    }));
                    setActions((prev) =>
                      prev.map((a) =>
                        a.id === taskId
                          ? {
                              ...a,
                              google_synced: true,
                              google_event_id: data.event_id,
                              google_event_url: data.event_url || "",
                              google_last_synced: new Date().toISOString(),
                            }
                          : a,
                      ),
                    );
                  } else if (app === "notion") {
                    setNotionSyncMap((prev) => ({
                      ...prev,
                      [taskId]: {
                        synced: true,
                        pageUrl: data.page_url || "",
                      },
                    }));
                    setActions((prev) =>
                      prev.map((a) =>
                        a.id === taskId
                          ? {
                              ...a,
                              notion_synced: true,
                              notion_page_id: data.page_id,
                              notion_page_url: data.page_url || "",
                              notion_last_synced: new Date().toISOString(),
                            }
                          : a,
                      ),
                    );
                  } else if (app === "slack") {
                    setActions((prev) =>
                      prev.map((a) =>
                        a.id === taskId
                          ? {
                              ...a,
                              slack_synced: true,
                              slack_message_ts: data.message_ts || null,
                              slack_channel_id: data.channel_id || null,
                              slack_last_synced: new Date().toISOString(),
                            }
                          : a,
                      ),
                    );
                  }
                }
              } catch (err) {
                console.error("Sync failed:", err);
                alert(`Couldn't sync this task to ${SYNC_APP_LABEL[app] || app}.\n\n${err.message}`);
              } finally {
                setSyncingTaskId(null);
              }
            }}
            syncingTaskId={syncingTaskId}
            notionSyncMap={notionSyncMap}
            googleSyncMap={googleSyncMap}
          />

        </Card>

      </div>

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

      <div id="decisions">

        <Card style={{ marginBottom: "24px" }}>

          <DecisionSection
            decisions={decisions}
            onAcceptDecision={acceptDecision}
            onRejectDecision={rejectDecision}
            onEditDecision={setDecisionToEdit}
            onDeleteDecision={setDecisionToDelete}
          />

        </Card>

      </div>

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
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
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

            fontFamily: "var(--body)",

            fontSize: "14px",

            fontWeight: 600,

            zIndex: 9999,
          }}
        >
          {toast.message}
        </motion.div>
      )}

    </div>

  );

}