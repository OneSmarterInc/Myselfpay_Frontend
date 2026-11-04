import "./request-status-tabs.css";

export default function RequestStatusTabs({
  value,
  counts,
  onChange,
  disabled = false,
}) {
  return (
    <div
      className="request-status-tabs"
      role="group"
      aria-label="Request status"
    >
      {[
        ["all", "All requests"],
        ["open", "Open requests"],
        ["approved", "Approved requests"],
      ].map(([key, label]) => (
        <button
          type="button"
          key={key}
          aria-label={label}
          aria-pressed={
            value === key || (value === "overview" && key === "all")
          }
          disabled={disabled}
          onClick={() => onChange(key)}
        >
          <span className="request-status-full">{label}</span>
          <span className="request-status-compact">
            {key === "all" ? "All" : key === "open" ? "Open" : "Approved"}
          </span>
          <small>{counts[key] || 0}</small>
        </button>
      ))}
    </div>
  );
}
