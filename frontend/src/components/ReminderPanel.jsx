    import { useCallback, useEffect, useState } from "react";

    import {
      BellRing,
      ChevronDown,
      ChevronRight,
      MoreVertical,
      Plus,
      Clock3,
      CalendarClock,
      Trash2,
      TriangleAlert,
    } from "./ui/icons";

    import "./ReminderPanel.css";
import { apiFetch } from "../lib/api";

    export default function ReminderPanel({
      actionId,
    }) {

      /* ==========================================
        State
      ========================================== */

      const [expanded, setExpanded] = useState(false);

      const [loading, setLoading] = useState(false);

      const [reminders, setReminders] = useState([]);

      const [addingReminder, setAddingReminder] = useState(false);

      const [newReminderLabel, setNewReminderLabel] = useState("");

      const [newReminderTime, setNewReminderTime] = useState("");

      const [activeReminderMenu, setActiveReminderMenu] =
        useState(null);

      const [showSnoozeMenu, setShowSnoozeMenu] =
        useState(null);

      const [confirmDelete, setConfirmDelete] =
        useState(null);

      const [editingReminder, setEditingReminder] =
        useState(null);

      const [editedReminderTime, setEditedReminderTime] =
        useState("");

      /* ==========================================
        Load reminders
      ========================================== */

      const loadReminders = useCallback(async () => {

        try {

          setLoading(true);

          const response = await apiFetch(
            `/actions/${actionId}/reminders`
          );

          if (!response.ok) {
            throw new Error("Failed to load reminders.");
          }

          const data = await response.json();

          setReminders(data.reminders || []);

        }

        catch (error) {

          console.error(error);

        }

        finally {

          setLoading(false);

        }

      }, [actionId]);

      const notifyRemindersUpdated = () => {
        window.dispatchEvent(new Event("remindersUpdated"));
      };

     useEffect(() => {
    // Avoid one authenticated request per task when the task list renders.
    // Reminders are fetched only when this task's panel is opened.
    if (!actionId || !expanded) return;
    const timeout = window.setTimeout(() => { void loadReminders(); }, 0);
    return () => window.clearTimeout(timeout);
}, [actionId, expanded, loadReminders]);

      /* ==========================================
        Create reminder
      ========================================== */

      const saveReminder = async () => {

        if (!newReminderLabel || !newReminderTime) {
          return;
        }

        try {

          await apiFetch(

            `/actions/${actionId}/reminders`,

            {

              method: "POST",

              headers: {

                "Content-Type": "application/json",

              },

              body: JSON.stringify({

                label: newReminderLabel,

                reminder_time:
                  new Date(newReminderTime).toISOString(),

              }),

            }

          );

          setAddingReminder(false);

          setNewReminderLabel("");

          setNewReminderTime("");

          await loadReminders();
          notifyRemindersUpdated();

        }

        catch (error) {

          console.error(error);

        }

      };

      /* ==========================================
        Update reminder
      ========================================== */

      const updateReminder = async (
        reminderId
      ) => {

        try {

          await apiFetch(

            `/reminders/${reminderId}`,

            {

              method: "PATCH",

              headers: {

                "Content-Type":
                  "application/json",

              },

              body: JSON.stringify({

                reminder_time:

                  new Date(
                    editedReminderTime
                  ).toISOString(),

              }),

            }

          );

          setEditingReminder(null);

          setEditedReminderTime("");

          await loadReminders();
          notifyRemindersUpdated();

        }

        catch (error) {

          console.error(error);

        }

      };

const snoozeReminder = async (
  reminderId,
  duration,
  customTime = null
) => {

  try {

    await apiFetch(

      `/reminders/${reminderId}/snooze`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          duration,

          custom_time: customTime,

        }),

      }

    );

    setShowSnoozeMenu(null);

    setActiveReminderMenu(null);

    await loadReminders();
    notifyRemindersUpdated();

  }

  catch (error) {

    console.error(error);

  }

};
      /* ==========================================
        Delete reminder
      ========================================== */

      const deleteReminder = async (
        reminderId
      ) => {

        try {

          await apiFetch(

            `/reminders/${reminderId}`,

            {

              method: "DELETE",

            }

          );

          setConfirmDelete(null);

          setActiveReminderMenu(null);

      
          await loadReminders();
          notifyRemindersUpdated();

        }

        catch (error) {

          console.error(error);

        }

      };
    return (

      <div className="reminderPanel">

        <button
          className="reminderPanelHeader"
          onClick={() =>
            setExpanded(!expanded)
          }
        >

          <div className="reminderPanelTitle">

            <BellRing size={18} />

            <span>

              Reminders

              {reminders.length > 0 && (
                <> ({reminders.length})</>
              )}

            </span>

          </div>

          {expanded ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronRight size={18} />
          )}

        </button>

        {expanded && (

          <div className="reminderPanelBody">

            {loading ? (

              <div className="reminderLoading">

                Loading reminders...

              </div>

            ) : reminders.length === 0 ? (

              <div className="emptyReminderState">

                No reminders yet.

              </div>

            ) : (

              reminders.map((reminder) => {

                const displayTime =
                  new Date(
                    reminder.reminder_time
                  ).toLocaleString(
                    "en-GB",
                    {

                      day:"2-digit",

                      month:"short",

                      year:"numeric",

                      hour:"2-digit",

                      minute:"2-digit",

                      hour12:true,

                    }

                  );

                return (

                  <div
                    key={reminder.id}
                    className="reminderCard"
                  >

                    <div className="reminderCardHeader">

                      <div className="reminderInfo">

                        <div className="reminderLabel">

                          {reminder.label}

                        </div>

                        <div className="reminderTime">

                          {displayTime}

                        </div>

                      </div>

                      <div className="reminderMenuContainer">

                        <button

                          className="reminderMore"

                          onClick={() => {

                            setConfirmDelete(null);

                            setEditingReminder(null);

                            setShowSnoozeMenu(null);

                            setActiveReminderMenu(

                              activeReminderMenu === reminder.id

                                ? null

                                : reminder.id

                            );

                          }}

                        >

                          <MoreVertical size={18} />

                        </button>
                        {activeReminderMenu === reminder.id && (

                          <div className="reminderDropdown">

                            {/* Snooze */}

                            <button
                              className="dropdownAction"
                              onClick={() => {

                                setEditingReminder(null);

                                setConfirmDelete(null);

                                setShowSnoozeMenu(

                                  showSnoozeMenu === reminder.id
                                    ? null
                                    : reminder.id

                                );

                              }}
                            >

                              <div className="dropdownActionLeft">

                                <Clock3 size={16} />

                                <span>

                                  Snooze

                                </span>

                              </div>

                              <ChevronRight size={15} />

                            </button>

                            {/* Reschedule */}

                            <button
                              className="dropdownAction"
                              onClick={() => {

                                setShowSnoozeMenu(null);

                                setConfirmDelete(null);

                                setActiveReminderMenu(null);

                                const localTime =
                                  new Date(
                                    reminder.reminder_time
                                  );

                                localTime.setMinutes(

                                  localTime.getMinutes() -

                                  localTime.getTimezoneOffset()

                                );

                                setEditedReminderTime(

                                  localTime
                                    .toISOString()
                                    .slice(0,16)

                                );

                                setEditingReminder(
                                  reminder.id
                                );

                              }}
                            >

                              <div className="dropdownActionLeft">

                                <CalendarClock size={16} />

                                <span>

                                  Reschedule

                                </span>

                              </div>

                            </button>

                            <div className="dropdownDivider" />

                            {/* Delete */}

                            <button
                              className="dropdownAction danger"
                              onClick={() => {

                                setShowSnoozeMenu(null);

                                setEditingReminder(null);

                                setActiveReminderMenu(null);

                                setConfirmDelete(
                                  reminder.id
                                );

                              }}
                            >

                              <div className="dropdownActionLeft">

                                <Trash2 size={16} />

                                <span>

                                  Delete Reminder

                                </span>

                              </div>

                            </button>

                          </div>

                        )}

                        {/* Snooze Panel */}

                        {showSnoozeMenu === reminder.id && (

<div className="snoozeDropdown">

    <button
        onClick={() =>
            snoozeReminder(
                reminder.id,
                "15m"
            )
        }
    >

        15 minutes

    </button>

    <button
        onClick={() =>
            snoozeReminder(
                reminder.id,
                "30m"
            )
        }
    >

        30 minutes

    </button>

    <button
        onClick={() =>
            snoozeReminder(
                reminder.id,
                "1h"
            )
        }
    >

        1 hour

    </button>

    <button
        onClick={() =>
            snoozeReminder(
                reminder.id,
                "tomorrow"
            )
        }
    >

        Tomorrow Morning

    </button>

    <button>

        Custom...

    </button>

</div>
                        )}
                        {/* Reschedule */}

                        {editingReminder === reminder.id && (

                          <div className="rescheduleReminderForm">

                            <div className="formGroup">

                              <label>

                                New Reminder Time

                              </label>

                              <input
                                type="datetime-local"
                                value={editedReminderTime}
                                onChange={(e) =>
                                  setEditedReminderTime(
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="reminderFormButtons">

                              <button
                                className="cancelReminderButton"
                                onClick={() => {

                                  setEditingReminder(null);

                                  setEditedReminderTime("");

                                }}
                              >

                                Cancel

                              </button>

                              <button
                                className="saveReminderButton"
                                onClick={() =>
                                  updateReminder(reminder.id)
                                }
                              >

                                Save

                              </button>

                            </div>

                          </div>

                        )}

                        {/* Delete Confirmation */}

                        {confirmDelete === reminder.id && (

                          <div className="deleteReminderConfirm">

                            <div className="deleteReminderHeader">

                              <TriangleAlert
                                size={18}
                                className="deleteReminderIcon"
                              />

                              <span>

                                Permanently delete this reminder?

                              </span>

                            </div>

                            <div className="deleteReminderText">

                              This reminder will be removed immediately.
                              This action cannot be undone.

                            </div>

                            <div className="deleteReminderButtons">

                              <button
                                className="cancelDeleteReminder"
                                onClick={() =>
                                  setConfirmDelete(null)
                                }
                              >

                                Cancel

                              </button>

                              <button
                                className="confirmDeleteReminder"
                                onClick={() =>
                                  deleteReminder(reminder.id)
                                }
                              >

                                Delete

                              </button>

                            </div>

                          </div>

                        )}

                      </div>

                    </div>

                  </div>

                );

              })

            )}

            {/* Add Reminder Button */}

            <button
              className="addReminderButton"
              onClick={() =>
                setAddingReminder(
                  !addingReminder
                )
              }
            >

              <Plus size={16} />

              <span>

                Add Reminder

              </span>

            </button>
            {addingReminder && (

              <div className="addReminderForm">

                <div className="formGroup">

                  <label>

                    Reminder Label

                  </label>

                  <input
                    type="text"
                    placeholder="Morning Reminder"
                    value={newReminderLabel}
                    onChange={(e) =>
                      setNewReminderLabel(
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="formGroup">

                  <label>

                    Reminder Time

                  </label>

                  <input
                    type="datetime-local"
                    value={newReminderTime}
                    onChange={(e) =>
                      setNewReminderTime(
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="reminderFormButtons">

                  <button
                    className="cancelReminderButton"
                    onClick={() => {

                      setAddingReminder(false);

                      setNewReminderLabel("");

                      setNewReminderTime("");

                    }}
                  >

                    Cancel

                  </button>

                  <button
                    className="saveReminderButton"
                    onClick={saveReminder}
                  >

                    Save Reminder

                  </button>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

    );

  }
