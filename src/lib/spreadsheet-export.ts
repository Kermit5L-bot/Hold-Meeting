function safeSpreadsheetText(value: string | number | undefined) {
  const text = String(value ?? "");
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: string | number | undefined) {
  return `"${safeSpreadsheetText(value).replaceAll("\"", "\"\"")}"`;
}

export function buildCsv(rows: Array<Array<string | number | undefined>>) {
  return `\uFEFF${rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n")}\r\n`;
}
