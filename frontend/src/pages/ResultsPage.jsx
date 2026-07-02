import "./ResultsPage.css";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

import {
  FileText,
  Pencil,
  Save,
} from "../components/ui/icons";

import SummarySection from "../components/results/SummarySection";
import TaskSection from "../components/results/TaskSection";
import ReminderSection from "../components/results/ReminderSection";
import ActionPlanSection from "../components/results/ActionPlanSection";
import DecisionSection from "../components/results/DecisionSection";
import RiskSection from "../components/results/RiskSection";

export default function ResultsPage() {

  const { sessionId } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [meetingName, setMeetingName] = useState("");

  useEffect(() => {

    async function loadMeeting() {

      try {

        const response = await fetch(
          `http://127.0.0.1:8000/session/${sessionId}`
        );

        const data = await response.json();

        setMeeting(data);
        setMeetingName(data.meeting_name);

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }

    }

    loadMeeting();

  }, [sessionId]);

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

          tasks={meeting.tasks}

        />

      </Card>

      <Card style={{ marginBottom: "24px" }}>

        <ReminderSection

          reminders={meeting.reminders}

        />

      </Card>

      <Card style={{ marginBottom: "24px" }}>

        <ActionPlanSection

          actionPlans={meeting.action_plan}

        />

      </Card>

      <Card style={{ marginBottom: "24px" }}>

        <DecisionSection

          decisions={meeting.decisions || []}

        />

      </Card>

      <Card>

        <RiskSection

          risks={meeting.risks || []}

        />

      </Card>

    </div>

  );

}