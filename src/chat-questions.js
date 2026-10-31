export const CHAT_QUESTIONS = [
  "Knee MRI near Cincinnati under $500",
  "Brain MRI without contrast near Hilo",
  "Knee MRI near Dayton",
];

export function predefinedQuestion(message) {
  const normalized = String(message || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  return (
    CHAT_QUESTIONS.find((question) => question.toLowerCase() === normalized) ||
    null
  );
}
