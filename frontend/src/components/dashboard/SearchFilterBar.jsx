export default function SearchFilterBar() {
  return (
    <section className="search-filter-bar">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search tasks, reminders, action plans..."
        />
      </div>

      <div className="filter-group">
        <select>
          <option>Priority</option>
        </select>

        <select>
          <option>Status</option>
        </select>

        <select>
          <option>Owner</option>
        </select>

        <select>
          <option>Due Date</option>
        </select>
      </div>
    </section>
  );
}