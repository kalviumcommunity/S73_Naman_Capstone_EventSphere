/** Date, price and text helpers shared across the app. */

const MS_DAY = 86400000;

function toDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Events are stored as absolute instants, but they happen in a place. A concert
 * in a New York park should read as 12:30 PM to every viewer, not shifted into
 * whatever timezone they happen to be browsing from — so all formatting is
 * pinned to the event's own zone when the provider gave us one.
 *
 * An unknown or rejected zone falls back to the viewer's locale rather than
 * throwing, which Intl does for an invalid timeZone string.
 */
function zoned(options, timezone) {
  if (!timezone) return options;
  try {
    // Cheap validity probe — throws RangeError on an unknown zone.
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return { ...options, timeZone: timezone };
  } catch {
    return options;
  }
}

/** "Sat, 14 Nov" — compact form used on cards. */
export function formatDateShort(value, timezone) {
  const d = toDate(value);
  if (!d) return "Date TBA";
  return d.toLocaleDateString(
    undefined,
    zoned({ weekday: "short", day: "numeric", month: "short" }, timezone)
  );
}

/** "Saturday, 14 November 2026" — used on the details page. */
export function formatDateLong(value, timezone) {
  const d = toDate(value);
  if (!d) return "Date to be announced";
  return d.toLocaleDateString(
    undefined,
    zoned({ weekday: "long", day: "numeric", month: "long", year: "numeric" }, timezone)
  );
}

/**
 * "7:30 pm", or null when the source published no time.
 * `hasTime === false` means the provider only gave a calendar date, so showing
 * "12:00 am" would imply a precision the data does not have.
 */
export function formatTime(value, { timezone, hasTime = true } = {}) {
  if (hasTime === false) return null;
  const d = toDate(value);
  if (!d) return null;
  return d.toLocaleTimeString(
    undefined,
    zoned({ hour: "numeric", minute: "2-digit" }, timezone)
  );
}

/** Short zone label ("EDT"), shown next to a time in a foreign timezone. */
export function timezoneLabel(value, timezone) {
  const d = toDate(value);
  if (!d || !timezone) return null;

  // Only worth showing when it differs from where the viewer is.
  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (viewerZone === timezone) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(d);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

/** Day-and-month split, for the calendar chip on a card. */
export function dateParts(value, timezone) {
  const d = toDate(value);
  if (!d) return { day: "--", month: "" };
  return {
    day: d.toLocaleDateString(undefined, zoned({ day: "numeric" }, timezone)),
    month: d
      .toLocaleDateString(undefined, zoned({ month: "short" }, timezone))
      .toUpperCase(),
  };
}

/** "Today" / "Tomorrow" / "In 6 days" / "Next month". */
export function relativeDay(value) {
  const d = toDate(value);
  if (!d) return "";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfEvent = new Date(d);
  startOfEvent.setHours(0, 0, 0, 0);

  const days = Math.round((startOfEvent - startOfToday) / MS_DAY);

  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  if (days < 31) return `In ${Math.round(days / 7)} weeks`;
  if (days < 60) return "Next month";
  return `In ${Math.round(days / 30)} months`;
}

/** Multi-day events read as a range: "7 – 8 September 2026". */
export function formatDateRange(start, end, timezone) {
  const a = toDate(start);
  const b = toDate(end);
  if (!a) return "Date TBA";

  const sameDay =
    b &&
    a.toLocaleDateString(undefined, zoned({ dateStyle: "short" }, timezone)) ===
      b.toLocaleDateString(undefined, zoned({ dateStyle: "short" }, timezone));

  if (!b || sameDay) return formatDateLong(a, timezone);

  const monthOf = (d) => d.toLocaleDateString(undefined, zoned({ month: "long" }, timezone));
  const yearOf = (d) => d.toLocaleDateString(undefined, zoned({ year: "numeric" }, timezone));
  const dayOf = (d) => d.toLocaleDateString(undefined, zoned({ day: "numeric" }, timezone));

  const sameMonth = monthOf(a) === monthOf(b) && yearOf(a) === yearOf(b);
  const sameYear = yearOf(a) === yearOf(b);

  // "7 – 8 September 2026" / "28 September – 2 October 2026" / full both sides.
  if (sameMonth) return `${dayOf(a)} – ${dayOf(b)} ${monthOf(b)} ${yearOf(b)}`;
  if (sameYear) return `${dayOf(a)} ${monthOf(a)} – ${dayOf(b)} ${monthOf(b)} ${yearOf(b)}`;
  return `${dayOf(a)} ${monthOf(a)} ${yearOf(a)} – ${dayOf(b)} ${monthOf(b)} ${yearOf(b)}`;
}

const CURRENCY_SYMBOLS = { USD: "$", GBP: "£", EUR: "€", INR: "₹", CAD: "C$", AUD: "A$" };

/** "Free", "$55", "$55 – $250", or null when no price data exists. */
export function formatPrice(price) {
  if (!price) return null;
  if (price.isFree) return "Free";
  if (price.min == null && price.max == null) return null;

  const symbol = CURRENCY_SYMBOLS[price.currency] || (price.currency ? `${price.currency} ` : "");
  const fmt = (n) => `${symbol}${Number(n) % 1 === 0 ? n : Number(n).toFixed(2)}`;

  if (price.min != null && price.max != null && price.max > price.min) {
    return `${fmt(price.min)} – ${fmt(price.max)}`;
  }
  return fmt(price.min ?? price.max);
}

/** Trim to a word boundary so cards never end mid-word. */
export function truncate(text, max = 130) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

export function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

/** The <input type="date"> value for a Date, in the viewer's own timezone. */
export function toDateInputValue(value) {
  const d = toDate(value);
  if (!d) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

/** The <input type="datetime-local"> value for a Date. */
export function toDateTimeInputValue(value) {
  const d = toDate(value);
  if (!d) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 16);
}

export const SOURCE_LABELS = {
  user: "Community",
  ticketmaster: "Ticketmaster",
  devevents: "developers.events",
  nycparks: "NYC Parks",
};
