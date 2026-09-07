/**
 * NYC Parks public events RSS — ~1,200 real, free local events across New York
 * City refreshed daily by the Department of Parks and Recreation. Keyless, and
 * the best source of genuinely *local* non-tech events (concerts, fitness,
 * tours, markets, kids' programming).
 *
 * Feed: https://www.nycgovparks.org/xml/events_300_rss.xml (next 14 days)
 */
const { fetchText } = require("../../utils/http");

const SOURCE = "nycparks";
const FEED_URL = "https://www.nycgovparks.org/xml/events_300_rss.xml";

// Ordered rules — the first matching feed category wins, so multi-category
// events land somewhere sensible rather than always in "Other".
const CATEGORY_RULES = [
  ["Food", ["food", "markets", "greenmarket"]],
  ["Music", ["concerts", "free summer concerts"]],
  ["Sports", [
    "sports", "fitness", "running/jogging", "basketball/netball", "football",
    "soccer", "baseball/softball", "pickleball", "track & field", "hiking",
    "exercise classes", "yoga & pilates classes", "martial arts", "swimming",
    "kayaking and canoeing", "outdoor fitness", "social sports", "shape up nyc",
    "strength training/weightlifting", "fishing", "dance classes",
  ]],
  ["Art", ["art", "arts & crafts", "theater", "film", "dance", "festivals"]],
  ["Tech", ["stem classes", "astronomy"]],
  ["Business", ["talks", "community input meetings", "workshops"]],
];

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&apos;": "'", "&nbsp;": " ", "&#39;": "'", "&rsquo;": "\u2019",
  "&ldquo;": "\u201c", "&rdquo;": "\u201d", "&ndash;": "\u2013", "&mdash;": "\u2014",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

const CDATA_RE = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/;

/** Strip a CDATA wrapper if present. */
function stripCdata(value) {
  const m = CDATA_RE.exec(value);
  return m ? m[1] : value;
}

/**
 * Pull one flat tag's text out of an <item> block, unwrapping CDATA.
 * Uses indexOf rather than a constructed RegExp so namespaced tag names
 * (event:startdate) need no escaping.
 */
function tag(block, name) {
  const open = "<" + name + ">";
  const close = "</" + name + ">";
  const start = block.indexOf(open);
  if (start === -1) return "";
  const from = start + open.length;
  const end = block.indexOf(close, from);
  if (end === -1) return "";
  return decodeEntities(stripCdata(block.slice(from, end))).trim();
}

/** Feed descriptions are HTML fragments; flatten to readable plain text. */
function htmlToText(html) {
  return decodeEntities(
    stripCdata(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickCategory(rawCategories) {
  const lower = rawCategories.toLowerCase();
  for (const [category, needles] of CATEGORY_RULES) {
    if (needles.some((n) => lower.includes(n))) return category;
  }
  return "Other";
}

function pickTags(rawCategories) {
  return [
    ...new Set(
      rawCategories
        .split("|")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .map((s) => s.slice(0, 40))
    ),
  ].slice(0, 8);
}

/** "10:00 am" -> {h,m} in 24h, or null when the feed omits a time. */
function parseTime(value) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(value.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") h += 12;
  return { h, m: Number(m[2]) };
}

/**
 * Build a Date from the feed's local (America/New_York) date + time.
 * NYC is UTC-4 during EDT and UTC-5 during EST; the feed's own pubDate carries
 * the abbreviation, so we derive the offset per item rather than assuming one.
 */
function toDate(dateStr, timeStr, isEDT) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const t = parseTime(timeStr) || { h: 12, m: 0 };
  const offsetHours = isEDT ? 4 : 5;
  const d = new Date(
    `${dateStr}T${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}:00Z`
  );
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + offsetHours * 60 * 60 * 1000);
}

/** The feed emits http:// URLs; the same host serves https, and mixed content
 *  is blocked once EventSphere is deployed behind TLS. */
function toHttps(url) {
  return url.startsWith("http://") ? "https://" + url.slice("http://".length) : url;
}

function parseCoordinates(raw) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(raw);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
  return { lat, lon };
}

function mapItem(block) {
  const guid = tag(block, "guid");
  const name = tag(block, "title");
  const startDate = tag(block, "event:startdate");
  if (!guid || !name || !startDate) return null;

  const isEDT = /EDT/.test(tag(block, "pubDate"));
  const startTime = tag(block, "event:starttime");
  const date = toDate(startDate, startTime, isEDT);
  if (!date) return null;

  const endDateStr = tag(block, "event:enddate");
  const endRaw = endDateStr ? toDate(endDateStr, tag(block, "event:endtime"), isEDT) : null;
  const endDate = endRaw && endRaw > date ? endRaw : undefined;

  const rawCategories = tag(block, "event:categories");
  const venue = tag(block, "event:location") || tag(block, "event:parknames");
  const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
  const description = descMatch ? htmlToText(descMatch[1]) : "";
  const image = tag(block, "event:image");

  return {
    source: SOURCE,
    sourceId: guid,
    name: name.slice(0, 160),
    date,
    endDate,
    timezone: "America/New_York",
    hasTime: parseTime(startTime) !== null,
    location: `${venue ? `${venue}, ` : ""}New York`.slice(0, 200),
    venue: venue.slice(0, 200),
    city: "New York",
    country: "United States",
    coordinates: parseCoordinates(tag(block, "event:coordinates")),
    isOnline: /virtual\/online events/i.test(rawCategories),
    description:
      (description || `${name} — a free public event hosted by NYC Parks.`).slice(0, 5000),
    category: pickCategory(rawCategories),
    tags: pickTags(rawCategories),
    image: /^https?:\/\//.test(image) ? toHttps(image).slice(0, 500) : "",
    url: toHttps(tag(block, "link")).slice(0, 500),
    // NYC Parks programming is free to attend.
    price: { min: 0, max: 0, currency: "USD", isFree: true },
  };
}

async function fetchEvents() {
  const xml = await fetchText(FEED_URL, {
    timeoutMs: 45000,
    retries: 2,
    encoding: "iso-8859-1",
  });

  const blocks = xml.split("<item>").slice(1);
  const now = Date.now();
  const byId = new Map();

  for (const block of blocks) {
    const item = block.split("</item>")[0];
    let mapped;
    try {
      mapped = mapItem(item);
    } catch {
      continue; // one malformed item must not sink the feed
    }
    if (!mapped) continue;
    if ((mapped.endDate || mapped.date).getTime() < now) continue;
    byId.set(mapped.sourceId, mapped);
  }

  return [...byId.values()];
}

module.exports = { name: SOURCE, label: "NYC Parks", fetchEvents, requiresKey: false, _mapItem: mapItem };
