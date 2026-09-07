/** Build and download an .ics file so an event can be saved to any calendar. */

function icsDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape the characters RFC 5545 treats as delimiters. */
function escapeText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Long lines must be folded at 75 octets, continued with a leading space. */
function fold(line) {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

export function buildIcs(event) {
  const start = new Date(event.date);
  // Events with no published end time get a two-hour default block.
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 3600 * 1000);

  const description = [event.description, event.url && `\n\nMore info: ${event.url}`]
    .filter(Boolean)
    .join("");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventSphere//Event Discovery//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event._id}@eventsphere`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.name)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(description)}`,
    event.url ? `URL:${escapeText(event.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map(fold).join("\r\n");
}

export function downloadIcs(event) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${(event.name || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** Map link for the venue — coordinates when we have them, otherwise a text search. */
export function mapUrl(event) {
  if (event.coordinates?.lat != null && event.coordinates?.lon != null) {
    return `https://www.openstreetmap.org/?mlat=${event.coordinates.lat}&mlon=${event.coordinates.lon}#map=16/${event.coordinates.lat}/${event.coordinates.lon}`;
  }
  const query = [event.venue, event.location, event.city, event.country].filter(Boolean).join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}
