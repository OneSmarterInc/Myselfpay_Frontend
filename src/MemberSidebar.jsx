import { useState } from "react";

export const memberGroups = [
  {
    key: "find",
    label: "Find facilities",
    items: [
      ["search", "Search"],
      ["agent", "Quick searches"],
      ["directory", "Browse all facilities"],
      ["compare", "Compare"],
    ],
  },
  {
    key: "requests",
    label: "My requests",
    items: [
      ["requests:all", "All"],
      ["requests:open", "Open"],
      ["requests:approved", "Time confirmed"],
      ["requests:closed", "Closed"],
    ],
  },
  { key: "profile", label: "My profile", items: [] },
  {
    key: "help",
    label: "Help",
    items: [
      ["faq", "FAQ"],
      ["about", "About"],
      ["contact", "Contact"],
    ],
  },
];

export function currentKey(view, tab) {
  if (view === "dashboard") return tab === "profile" ? "profile" : `requests:${tab || "all"}`;
  if (view === "agent") return "agent";
  if (view === "search" || view.startsWith("facility/") || view.startsWith("request")) return "search";
  return "";
}

export const centerGroups = [
  {
    key: "inbox",
    label: "Inbox",
    items: [
      ["inbox:open", "New"],
      ["inbox:approved", "Time confirmed"],
      ["inbox:closed", "Closed"],
      ["inbox:all", "All"],
    ],
  },
  { key: "prices", label: "Self-pay prices", items: [] },
  { key: "profile", label: "Center profiles", items: [] },
  {
    key: "help",
    label: "Help",
    items: [
      ["faq", "FAQ"],
      ["contact", "Contact"],
    ],
  },
];

function groupOf(groups, key) {
  const hit = groups.find((group) => group.key === key || group.items.some(([item]) => item === key));
  return hit ? hit.key : "";
}

export default function MemberSidebar({ initials, name, detail, current, onGo, open, onClose, total, groups = memberGroups, label = "Account menu", navLabel = "Dashboard sections" }) {
  const [opened, setOpened] = useState({});
  const active = groupOf(groups, current);
  const isOpen = (group) => (group.key in opened ? opened[group.key] : group.key === active);
  const go = (key) => {
    onGo(key);
    onClose?.();
  };
  return (
    <aside className={"dashboard-sidebar member-sidebar" + (open ? " is-open" : "")} aria-label={label}>
      <div className="dashboard-account-mini">
        <span className="dashboard-avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <strong>{name}</strong>
          <span>{detail}</span>
        </div>
      </div>
      <nav className="dashboard-tabs" aria-label={navLabel}>
        {groups.map((group) =>
          group.items.length === 0 ? (
            <button
              type="button"
              key={group.key}
              className="side-parent"
              aria-label={group.label}
              aria-current={current === group.key ? "page" : undefined}
              onClick={() => go(group.key)}
            >
              {group.label}
            </button>
          ) : (
            <div className="side-group" key={group.key}>
              <button
                type="button"
                className="side-parent"
                aria-label={group.label}
                aria-expanded={isOpen(group)}
                aria-current={group.key === active ? "true" : undefined}
                onClick={() => {
                  if (group.key !== active) {
                    setOpened((old) => ({ ...old, [group.key]: true }));
                    if (group.items.length && ["requests", "inbox"].includes(group.key)) go(group.items[0][0]);
                    return;
                  }
                  setOpened((old) => ({ ...old, [group.key]: !isOpen(group) }));
                }}
              >
                {group.label}
                {typeof total?.[group.key] === "number" && <span>{total[group.key]}</span>}
                <i aria-hidden="true">{isOpen(group) ? "–" : "+"}</i>
              </button>
              {isOpen(group) && (
                <div className="side-sub">
                  {group.items.map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      aria-current={current === key ? "page" : undefined}
                      onClick={() => go(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </nav>
      <button type="button" className="side-signout" onClick={() => go("signout")}>
        Sign out
      </button>
    </aside>
  );
}
