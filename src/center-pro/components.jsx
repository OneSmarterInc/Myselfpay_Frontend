import Icon from "./Icon.jsx";
import { useEffect, useRef, useState } from "react";
export function Alert({ children, error = false }) {
  return (
    <div
      className={"notice " + (error ? "error" : "")}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Status({ value }) {
  return (
    <span
      className={"badge " + (value === "confirmed" ? "success" : "pending")}
    >
      {value === "confirmed" ? "Confirmed" : value === "closed" ? "Closed" : "Needs scheduling"}
    </span>
  );
}
export function money(value) {
  if (value === null || value === undefined || value === "") return "Quote required";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}
export function dateTime(value, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function Pagination({ count, page, size, onPage }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="pagination">
      <span aria-live="polite">
        {count ? (page - 1) * size + 1 : 0}–{Math.min(page * size, count)} of{" "}
        {count} records
      </span>
      {pages > 1 && <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="back" /> Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <Icon name="next" /> Next
        </button>
      </div>}
    </div>
  );
}
export function Drawer({ open, onClose, onNavigate, route, role }) {
  const ref = useRef(null),
    timer = useRef(null);
  const [visible, setVisible] = useState(false);
  const [desktop, setDesktop] = useState(() => matchMedia("(min-width: 961px)").matches);
  useEffect(() => {
    const media = matchMedia("(min-width: 961px)");
    const update = () => { setDesktop(media.matches); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    clearTimeout(timer.current);
    let frame;
    if (open && !desktop) {
      if (!ref.current.open) ref.current.showModal();
      document.body.style.overflow = "hidden";
      frame = requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timer.current = setTimeout(
        () => {
          ref.current?.close();
          document.body.style.overflow = "";
        },
        matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220,
      );
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer.current);
      document.body.style.overflow = "";
    };
  }, [open, desktop]);
  const links =
    role === "admin"
      ? [
          ["overview", "Overview"],
          ["admin-centers", "Centers and access"],
          ["admin-audit", "Organization audit"],
        ]
      : role === "staff"
        ? [
            ["overview", "Overview"],
            ["requests", "Requests"],
            ["availability", "Scheduling"],
            ["audit", "Activity log"],
          ]
        : [
            ["overview", "Overview"],
            ["inbox", "Inbox"],
            ["self-pay-prices", "Self-pay prices"],
            ["profiles", "Center profiles"],
            ["pricing", "Price comparison"],
            ["previous-scans", "Previous scans"],
            ["subscription", "Subscription"],
            ["audit", "Activity log"],
          ];
  const navigation = (
      <nav aria-label="Center Pro pages">
        {links.map(([id, label]) => (
          <button
            key={id}
            aria-current={route.split("/")[0] === id ? "page" : undefined}
            className={route.split("/")[0] === id ? "active" : ""}
            onClick={() => {
              onClose();
              onNavigate(id);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
  );
  return (
    <>
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <p className="sidebar-caption">{role === "admin" ? "Administrator workspace" : role === "staff" ? "Staff workspace" : "Owner workspace"}</p>
        {navigation}
      </aside>
    <dialog
      ref={ref}
      className={"drawer " + (visible ? "visible" : "")}
      aria-labelledby="menu-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.target === e.currentTarget &&
          (e.clientX > r.right || e.clientX < r.left)
        )
          onClose();
      }}
    >
      <div className="drawer-header">
        <h2 id="menu-title">Center Pro</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close navigation" title="Close navigation">
          <Icon name="close" />
        </button>
      </div>
      <p className="muted">
        {role === "admin"
          ? "Administrator workspace"
          : role === "staff"
            ? "Staff workspace"
            : "Owner workspace"}
      </p>
      {navigation}
    </dialog>
    </>
  );
}

export function WorkspaceSections({ route, role }) {
  const groups = [
    ...(role === "staff" ? [{ label: "Scheduling", items: [["availability", "Available slots"], ["working-hours", "Working hours"]], aliases: [] }] : []),
  ];
  const group = groups.find(g => g.items.some(([path]) => path === route) || g.aliases.includes(route));
  if (!group) return null;
  const active = route === "rescue" ? "requests" : route;
  return <nav className="workspace-sections no-print" aria-label={`${group.label} sections`}>
    {group.items.map(([path, label]) => <a key={path} href={`#center-pro/${path}`} aria-current={active === path ? "page" : undefined}>{label}</a>)}
  </nav>;
}
