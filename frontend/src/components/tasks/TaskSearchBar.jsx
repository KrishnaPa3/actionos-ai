export default function TaskSearchBar({
  search,
  setSearch,
}) {
  return (
    <div className="task-search-bar">
      <input
        type="text"
        placeholder="Search tasks and reminders..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}