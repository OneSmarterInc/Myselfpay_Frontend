const labels = {
  "access.directory_owner": "Default owner access granted",
  "profile.submitted": "Profile change submitted",
  "profile.approved": "Profile change approved",
  "profile.rejected": "Profile change rejected",
  "price.submitted": "Price submitted for review",
  "price.approved": "Price approved",
  "price.rejected": "Price rejected",
  "contact.updated": "Contact information updated",
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
  return ({appointment: "Appointments", schedule: "Scheduling", patient: "Patient links", estimate: "Estimates", access: "Access", offer: "Pricing", outreach: "Outreach", profile: "Center profile", price: "Pricing", contact: "Contact details"})[action.split(".")[0]] || "Activity";
}

export function activityDetails(event) {
  if (!event.field) return [];
  const field=({zip:'ZIP code',address:'Address',website:'Website',phone:'Phone',email:'Email'})[event.field] || event.field;
  if(event.action.startsWith('price.')) return [`${field}: ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(event.new_value)/100)}`];
  const lines=[];
  if(event.old_value) lines.push(`Previous ${field.toLowerCase()}: ${event.old_value}`);
  const applied=event.action.endsWith('.approved')||event.action==='contact.updated';
  if(event.new_value) lines.push(`${applied?'Updated':'Requested'} ${field.toLowerCase()}: ${event.new_value}`);
  return lines;
}
