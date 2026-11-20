function usFormat(ten) {
  return "(" + ten.slice(0, 3) + ") " + ten.slice(3, 6) + "-" + ten.slice(6);
}

// Show a US number the way people read it: (817) 714-6241. Anything else is shown as given.
export function formatPhone(value) {
  const parsed = parsePhone(value);
  return parsed ? parsed.display : String(value ?? "");
}

function parsePhone(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const extension = text.match(/(?:ext\.?|extension|x|#)\s*(\d{1,8})\s*$/i);
  const main = extension ? text.slice(0, extension.index).trim() : text;
  let digits, display;
  if (/^\+[\d\s().-]+$/.test(main)) {
    digits = main.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return null;
    display = digits.length === 11 && digits[0] === "1" ? usFormat(digits.slice(1)) : "+" + digits;
  } else {
    const match = main.match(
      /(?:\+?1[\s.-]*)?(?:\((\d{3})\)|(\d{3}))[\s.-]*(\d{3})[\s.-]*(\d{4})(?!\d)/,
    );
    if (!match || (match.index > 0 && /\d/.test(main[match.index - 1])))
      return null;
    const area = match[1] || match[2];
    digits = "1" + area + match[3] + match[4];
    display = usFormat(area + match[3] + match[4]);
  }
  return {
    display: display + (extension ? " ext. " + extension[1] : ""),
    href: "tel:+" + digits + (extension ? ";ext=" + extension[1] : ""),
  };
}

export function centerPhone(entry = {}) {
  const fields = new Map(
    Object.entries(entry).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value,
    ]),
  );
  for (const key of [
    "phone",
    "phonenumber",
    "telephone",
    "telephonenumber",
    "contactphone",
    "contactnumber",
    "callingnumber",
    "callingno",
    "phoneclinic",
  ]) {
    const phone = parsePhone(fields.get(key));
    if (phone) return phone;
  }
  return parsePhone(entry.coverage);
}
