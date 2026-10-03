const escapeCsvCell = (value) => {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[\t\r\n ]*[=+@-]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

export const encodeCsvRows = (rows) =>
  `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
