// One place for the words a patient sees about a request.
const base = {
  requested: "Waiting for the facility to call",
  voicemail: "The facility tried to reach you",
  scheduled: "Time confirmed",
  unable: "This facility couldn’t schedule. Try another facility",
  expired: "Request expired",
  cancelled: "Request closed",
};
const reasons = {
  patient_cancelled: "You cancelled this request",
  scheduled_elsewhere: "Closed because you booked this exam at another facility",
  no_openings: "This facility has no openings right now. Try another facility",
  not_offered: "This facility doesn’t offer this exam. Try another facility",
  other: "This facility couldn’t schedule. Try another facility",
};
export const OPEN_STATUSES = ["requested", "voicemail", "scheduled"];
export function statusLabel(item) {
  if (["cancelled", "unable"].includes(item.status) && reasons[item.closed_reason])
    return reasons[item.closed_reason];
  return base[item.status] || item.status;
}
export const canCancel = (item) => OPEN_STATUSES.includes(item.status);
