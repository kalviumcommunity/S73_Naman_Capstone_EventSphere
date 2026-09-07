/**
 * developers.events — a community-maintained, continuously updated open dataset
 * of real developer conferences and meetups worldwide. No API key required, so
 * EventSphere ships with genuine data out of the box.
 *
 * Shape: [{ name, date:[startMs, endMs?], hyperlink, city, country,
 *           location, tags:[{key,value}], status }]
 */
const { fetchJson } = require("../../utils/http");

const SOURCE = "devevents";
const FEED_URL = "https://developers.events/all-events.json";

// Tag topics that read as business/leadership rather than engineering.
const BUSINESS_TOPICS = new Set([
  "product", "management", "leadership", "agile", "marketing",
  "business", "entrepreneurship", "startup", "career",
]);

const DESIGN_TOPICS = new Set(["design", "ux", "ui", "accessibility"]);

/** Flatten [{key,value}] tag objects into a deduped lowercase string list. */
function flattenTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(
      tags
        .map((t) => (typeof t === "string" ? t : t && t.value))
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => t.trim().toLowerCase().slice(0, 40))
    ),
  ].slice(0, 12);
}

function pickCategory(tags) {
  if (tags.some((t) => BUSINESS_TOPICS.has(t))) return "Business";
  if (tags.some((t) => DESIGN_TOPICS.has(t))) return "Art";
  return "Tech";
}

/** A stable id: the source has no ids, but name+start is unique in practice. */
function stableId(raw, startMs) {
  return `${raw.name}__${new Date(startMs).toISOString().slice(0, 10)}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 180);
}

function buildDescription(raw, tags) {
  const where = raw.country === "Online" ? "online" : `in ${raw.city}, ${raw.country}`;
  const topics = tags.filter((t) => !["english", "french", "spanish", "german"].includes(t));
  const topicLine = topics.length
    ? ` Topics include ${topics.slice(0, 5).join(", ")}.`
    : "";
  const cfp =
    raw.cfp && raw.cfp.link && raw.cfp.until
      ? ` Call for papers is open until ${raw.cfp.until}.`
      : "";
  return `${raw.name} is a developer conference taking place ${where}.${topicLine}${cfp} Visit the official site for the full schedule, speakers and tickets.`.slice(
    0,
    5000
  );
}

async function fetchEvents() {
  const all = await fetchJson(FEED_URL, { timeoutMs: 45000, retries: 2 });
  if (!Array.isArray(all)) throw new Error("Unexpected feed shape: expected an array");

  const now = Date.now();
  const out = [];

  for (const raw of all) {
    if (!raw || !raw.name || !Array.isArray(raw.date) || !raw.date.length) continue;

    const startMs = Number(raw.date[0]);
    const endMs = raw.date.length > 1 ? Number(raw.date[1]) : null;
    if (!Number.isFinite(startMs)) continue;

    // Keep only events that have not finished yet.
    const effectiveEnd = Number.isFinite(endMs) ? endMs : startMs;
    if (effectiveEnd < now) continue;

    const tags = flattenTags(raw.tags);
    const isOnline = raw.country === "Online" || /online/i.test(raw.location || "");

    out.push({
      source: SOURCE,
      sourceId: stableId(raw, startMs),
      name: String(raw.name).trim().slice(0, 160),
      date: new Date(startMs),
      endDate: Number.isFinite(endMs) && endMs > startMs ? new Date(endMs) : undefined,
      // The feed carries calendar dates, not start times.
      hasTime: false,
      location: (raw.location || raw.city || "Online").trim().slice(0, 200),
      city: isOnline ? "Online" : (raw.city || "").trim().slice(0, 100),
      country: (raw.country || "").trim().slice(0, 100),
      isOnline,
      description: buildDescription(raw, tags),
      category: pickCategory(tags),
      tags,
      url: typeof raw.hyperlink === "string" ? raw.hyperlink.slice(0, 500) : "",
      image: "",
      price: { isFree: false },
    });
  }

  return out;
}

module.exports = { name: SOURCE, label: "developers.events", fetchEvents, requiresKey: false };
