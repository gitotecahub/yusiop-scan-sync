/**
 * Parses a free-form rejection reason string into a list of bullet items.
 * Splits by newlines and common list markers (-, *, •, ·, numbered lists).
 * Falls back to splitting by ". " when the text is a single long sentence-list.
 */
export function parseRejectionReason(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const text = raw.trim();
  if (!text) return [];

  // 1) Split by newlines first
  let parts = text
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2) If only one line but it contains inline bullet markers, split by them
  if (parts.length === 1) {
    const inline = parts[0]
      .split(/\s*(?:[•·]|(?:^|\s)-\s|(?:^|\s)\*\s|;\s|\|\s)/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (inline.length > 1) parts = inline;
  }

  // 3) If still one item and it's long, split by sentences (". ")
  if (parts.length === 1 && parts[0].length > 90) {
    const sentences = parts[0]
      .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) parts = sentences;
  }

  // Strip leading list markers/numbers from each item
  return parts.map((p) =>
    p.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '').trim()
  ).filter(Boolean);
}
