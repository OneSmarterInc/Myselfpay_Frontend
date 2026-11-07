export const appointmentZones = {
  "America/New_York": "Eastern",
  "America/Chicago": "Central",
  "America/Denver": "Mountain",
  "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific",
  "America/Anchorage": "Alaska",
  "Pacific/Honolulu": "Hawaii",
};
export function approvedSlotLabel(slot) {
  if (!slot)
    return "Approved time was not recorded. Contact the center for details.";
  const date = new Date(slot.date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const [hour, minute] = (slot.time || "00:00").split(":").map(Number);
  const when = slot.period
    ? slot.period === "morning"
      ? "Morning (8 am–12 pm)"
      : "Afternoon (12–5 pm)"
    : `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  return `${date} · ${when} · ${appointmentZones[slot.timezone] || slot.timezone} time`;
}
export function approvalReady(choice) {
  return (
    !!choice &&
    (Number.isInteger(choice.preferred_index) ||
      (/^\d{4}-\d{2}-\d{2}$/.test(choice.date || "") &&
        /^\d{2}:\d{2}$/.test(choice.time || "")))
  );
}
