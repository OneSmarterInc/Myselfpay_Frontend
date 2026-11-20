// A reference code as people read and say it: MSP-40E8-4C8B-83F6-C3CA.
export function groupCode(code) {
  const text = String(code ?? "").trim();
  const match = text.match(/^(MSP)-?([0-9A-Za-z]+)$/i);
  if (!match) return text;
  const body = match[2].toUpperCase();
  return ["MSP", ...(body.match(/.{1,4}/g) || [])].join("-");
}
