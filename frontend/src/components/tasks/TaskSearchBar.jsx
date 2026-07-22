export default function TaskSearchBar({
  search,
  setSearch,
}) {
  return (
    <div className="task-search-bar">
      <input
        type="text"
        placeholder="Search tasks, owners, or source meetings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search tasks"
      />
    </div>
  );
}
