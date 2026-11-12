import { useId } from "react";
import { approvedSlotLabel, appointmentZones } from "./approved-slot.js";
import "./approval-slots.css";

export default function ApprovalSlotPicker({
  request,
  value,
  onChange,
  disabled,
}) {
  const id = useId();
  const custom = value && !Number.isInteger(value.preferred_index);
  return (
    <fieldset className="appointment-choice" disabled={disabled}>
      <legend>Select an appointment time</legend>
      <p>
        Choose one preferred time, or set an alternative if none are available.
      </p>
      {(request.slots || []).map((slot, index) => (
        <label className="appointment-option" key={slot.date + slot.period}>
          <input
            type="radio"
            name={id}
            checked={value?.preferred_index === index}
            onChange={() => onChange({ preferred_index: index })}
          />
          <span>
            {approvedSlotLabel({ ...slot, timezone: request.timezone })}
          </span>
        </label>
      ))}
      <label className="appointment-option">
        <input
          type="radio"
          name={id}
          checked={!!custom}
          onChange={() => onChange({ date: "", time: "" })}
        />
        <span>Set an alternative date and time</span>
      </label>
      {custom && (
        <div className="appointment-custom">
          <label>
            Appointment date
            <input
              type="date"
              value={value.date}
              onChange={(e) => onChange({ ...value, date: e.target.value })}
            />
          </label>
          <label>
            Appointment time
            <input
              type="time"
              value={value.time}
              onChange={(e) => onChange({ ...value, time: e.target.value })}
            />
          </label>
        </div>
      )}
      <p className="appointment-zone">
        Times are in the center’s{" "}
        {appointmentZones[request.timezone] || request.timezone} time zone. The
        approved time will appear in the patient’s dashboard.
      </p>
    </fieldset>
  );
}
