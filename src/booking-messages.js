export function deliveryMessage(delivery) {
  return (
    {
      secure_mail_pending: "Your request is saved. Secure Mail is preparing a private conversation and will email you and the clinic.",
      secure_mail_ready: "Your request is available in Secure Mail. The clinic can review and confirm it in the secure conversation.",
      sent: "Your booking request was emailed to the center. The clinic must confirm the appointment.",
      queued: "Your request is saved and its center notification is queued.",
      sending: "Your request is saved. Its center notification is being sent.",
      failed:
        "Your request is saved, but the center email could not be sent. Please contact support; do not submit a duplicate request.",
      uncertain:
        "Your request is saved. Email delivery has not been confirmed. Contact support before submitting another request.",
      suppressed:
        "No email sent to clinic (testing mode). This request does not reserve an appointment.",
    }[delivery] ||
    "Your request is saved. The clinic must confirm the appointment."
  );
}

export function productionBookingCopy(html, enabled) {
  if (!enabled) return html;
  return html
    .replace(
      "Testing mode: the clinic will not be emailed. Verification codes are sent to your personal email. Use sample patient details and an inbox you control.",
      "Your request will be emailed to the center after you verify your personal email. Preferred times are requests, not confirmed appointments.",
    )
    .replace(
      "Preview only. No clinic will receive this request.",
      "The center will receive your booking request by email. Your appointment is confirmed only when the clinic contacts you.",
    )
    .replace(
      "about this request when delivery is enabled. I understand this preview will not contact the clinic.",
      "about this appointment request. I understand that the center will receive the request and must confirm the appointment.",
    )
    .replace(
      "Do not enter medical records, diagnoses, insurance details or real patient information.",
      "Do not enter medical records, diagnoses or insurance details.",
    );
}
