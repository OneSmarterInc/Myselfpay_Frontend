// Builds a calendar file for a confirmed time. The time is the facility's local time, so the
// event is written without a zone and opens at the same clock time in any calendar app.
const WINDOWS = { morning: ["08:00", "12:00"], afternoon: ["12:00", "17:00"] };

function clock(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? { h, m } : null;
}
function stamp(date, { h, m }) {
  return date.replace(/-/g, "") + "T" + String(h).padStart(2, "0") + String(m).padStart(2, "0") + "00";
}
function addMinutes(date, time, minutes) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMinutes(time.h * 60 + time.m + minutes);
  const day = d.toISOString().slice(0, 10);
  return stamp(day, { h: d.getUTCHours(), m: d.getUTCMinutes() });
}
const text = (value) => String(value || "").replace(/[\;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

export function calendarFile(request) {
  const slot = request?.approved_slot;
  if (!slot || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date || "")) return null;
  let start, end;
  if (slot.period && WINDOWS[slot.period]) {
    const [from, to] = WINDOWS[slot.period].map(clock);
    start = stamp(slot.date, from);
    end = stamp(slot.date, to);
  } else {
    const from = clock(slot.time);
    if (!from) return null;
    start = stamp(slot.date, from);
    end = addMinutes(slot.date, from, 60);
  }
  const exam = [request.service, request.exam].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MySelfPay//Request//EN",
    "BEGIN:VEVENT",
    `UID:${request.id}@myselfpay`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${text((exam || "Imaging") + " at " + request.clinic_name)}`,
    `LOCATION:${text([request.clinic_name, request.location].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${text("Bring your imaging order and your reference code " + request.id + ". To change the time, call the facility" + (request.clinic_phone ? " at " + request.clinic_phone : "") + ".")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename: `myselfpay-${request.id}.ics`,
    href: "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n")),
  };
}
