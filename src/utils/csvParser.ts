
export function parseCSV(text: string): Record<string, string>[] {
  if (!text) return [];


  const rawLines = text.split(/\r\n|\n/).filter(l => l.length > 0);

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields.map(f => f.trim());
  }

  const lines = rawLines.map(l => parseLine(l));
  if (lines.length === 0) return [];

  const rawHeaders = lines[0];
  const headers = rawHeaders.map(h => String(h ?? '').trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = String(row[i] ?? '').trim();
    }
    rows.push(obj);
  }

  return rows;
}
