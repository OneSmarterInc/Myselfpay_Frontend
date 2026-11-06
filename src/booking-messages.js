export function deliveryMessage(delivery, notificationTarget = "center") {
  if (notificationTarget === "support") {
    if (delivery === "sent") return "Your request was sent to MySelfPay Patient Care for follow-up with the center. The center must confirm your appointment.";
    if (["failed", "uncertain"].includes(delivery)) return "Your request is saved, but its delivery to MySelfPay Patient Care has not been confirmed. Contact support before submitting another request.";
    if (delivery === "suppressed") return "Your request is saved in testing mode. No email was sent to MySelfPay Patient Care.";
    return "Your request is saved. Its notification to MySelfPay Patient Care is queued for follow-up with the center.";
  }
  return (
    {
      secure_mail_pending: "Your request is saved. The center notification is being prepared.",
      secure_mail_ready: "Your request is available for the center to review.",
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
