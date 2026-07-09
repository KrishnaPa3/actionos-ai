export default function TaskFilters({
  priority,
  setPriority,
  status,
  setStatus,
  owner,
  setOwner,
  owners,
  session,
  setSession,
  sessions,
  dateMode,
  setDateMode,
  selectedDate,
  setSelectedDate,
  endDate,
  setEndDate,
}) {
  const handleDateModeChange = (e) => {
    const mode = e.target.value;

    setDateMode(mode);

    // Reset previous dates when switching modes
    setSelectedDate("");
    setEndDate("");
  };

  return (
    <div className="task-filters">

      {/* Status */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      {/* Priority */}
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option value="">Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {/* Owner */}
      <select
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
      >
        <option value="">Owner</option>

        {(owners || []).map((ownerName) => (
          <option
            key={ownerName}
            value={ownerName}
          >
            {ownerName}
          </option>
        ))}
      </select>

      {/* Date */}
      <div className="date-filter">

        <select
          value={dateMode}
          onChange={handleDateModeChange}
        >
          <option value="">Date</option>
          <option value="on">On</option>
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="between">Between</option>
        </select>

        {dateMode && (
          <div className="date-input-group">

            <label className="date-label">
              {dateMode === "between" ? "From" : "Date"}
            </label>

            <input
              type="date"
              className="date-picker"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

          </div>
        )}

        {dateMode === "between" && (
          <div className="date-input-group">

            <label className="date-label">
              To
            </label>

            <input
              type="date"
              className="date-picker"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

          </div>
        )}

      </div>

      {/* Source Session */}
      <select
        value={session}
        onChange={(e) => setSession(e.target.value)}
      >
        <option value="">
          Source Session
        </option>

        {(sessions || []).map((meeting) => (
          <option
            key={meeting.id}
            value={meeting.id}
          >
            {meeting.meeting_name}
          </option>
        ))}
      </select>

    </div>
  );
}