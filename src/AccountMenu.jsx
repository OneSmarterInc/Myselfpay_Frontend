import { useEffect, useRef, useState } from "react";

// One account control for the header. items: [{ label, onSelect }]
export default function AccountMenu({ initial, label, items, busy }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => {
      if (root.current && !root.current.contains(event.target)) setOpen(false);
    };
    const key = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="account-menu" ref={root}>
      <button
        type="button"
        id="accountMenuButton"
        className="account-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="accountMenuList"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-initial" aria-hidden="true">{initial}</span>
        <span className="account-label">{label}</span>
      </button>
      {open && (
        <ul id="accountMenuList" role="menu" className="account-menu-list">
          {items.map((item) => (
            <li role="none" key={item.label}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
