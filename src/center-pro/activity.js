const labels = {
  "appointment.confirmed": "Appointment confirmed",
  "offer.price_changed": "Offer price updated",
  "schedule.hours_updated": "Working hours updated",
  "schedule.slot_added": "Available slot added",
  "schedule.slot_blocked": "Slot blocked",
  "schedule.slot_unblocked": "Slot reopened",
  "patient.link_created": "Patient request link created",
  "estimate.drafted": "Estimate draft created",
  "access.assigned": "Center access assigned",
  "access.revoked": "Center access revoked",
  "outreach.visited": "Outreach visit recorded",
  "outreach.follow_up": "Outreach follow-up recorded",
  "outreach.rate_sheet_shared": "Rate sheet share recorded",
};
export function activityLabel(action) {
  const label = labels[action] || action.replaceAll(".", " ").replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
export function activityCategory(action) {
  return ({appointment: "Appointments", schedule: "Scheduling", patient: "Patient links", estimate: "Estimates", access: "Access", offer: "Pricing", outreach: "Outreach"})[action.split(".")[0]] || "Activity";
}
