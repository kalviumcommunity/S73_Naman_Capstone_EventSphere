/**
 * Ticketmaster Discovery API v2 — real ticketed local events (concerts, sports,
 * theatre) with venues, coordinates, images and price ranges.
 *
 * Needs a free API key: https://developer-acct.ticketmaster.com/user/register
 * Set TICKETMASTER_API_KEY in backend/.env. Without it this provider is skipped
 * and EventSphere falls back to its keyless sources.
 */
const env = require("../../config/env");
const { fetchJson, sleep } = require("../../utils/http");

const SOURCE = "ticketmaster";
const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGE_SIZE = 100;
const MAX_PAGES_PER_CITY = 2; // 200 events/city keeps us far inside the free quota
const REQUEST_GAP_MS = 250; // Discovery API allows 5 req/sec

// Ticketmaster "segments" -> EventSphere categories.
const SEGMENT_TO_CATEGORY = {
  Music: "Music",
  Sports: "Sports",
  "Arts & Theatre": "Art",
  Film: "Art",
  Miscellaneous: "Other",
};

/** Pick the widest 16:9 image so cards get a usable cover. */
function pickImage(images) {
  if (!Array.isArray(images) || !images.length) return "";
  const ranked = [...images].sort((a, b) => {
    const ratioScore = (img) => (img.ratio === "16_9" ? 0 : img.ratio === "3_2" ? 1 : 2);
    const r = ratioScore(a) - ratioScore(b);
    return r !== 0 ? r : (b.width || 0) - (a.width || 0);
  });
  return (ranked[0] && ranked[0].url) || "";
}

function pickCategory(classifications) {
  const c = Array.isArray(classifications) ? classifications[0] : null;
  const segment = c && c.segment && c.segment.name;
  return SEGMENT_TO_CATEGORY[segment] || "Other";
}

function pickTags(classifications) {
  const c = Array.isArray(classifications) ? classifications[0] : null;
  if (!c) return [];
  return [
    ...new Set(
      [c.genre && c.genre.name, c.subGenre && c.subGenre.name, c.segment && c.segment.name]
        .filter((t) => typeof t === "string" && t && t !== "Undefined")
        .map((t) => t.toLowerCase().slice(0, 40))
    ),
  ];
}

function pickPrice(priceRanges) {
  const p = Array.isArray(priceRanges) ? priceRanges[0] : null;
  if (!p) return { isFree: false };
  const min = Number(p.min);
  const max = Number(p.max);
  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    currency: p.currency || undefined,
    isFree: Number.isFinite(min) && min === 0,
  };
}

function buildDescription(raw, venueName, cityName) {
  const parts = [];
  if (raw.info) parts.push(String(raw.info).trim());
  if (!parts.length && raw.description) parts.push(String(raw.description).trim());
  if (!parts.length) {
    const where = [venueName, cityName].filter(Boolean).join(", ");
    parts.push(`${raw.name}${where ? ` live at ${where}` : ""}. Tickets and full event information are available on Ticketmaster.`);
  }
  if (raw.pleaseNote) parts.push(String(raw.pleaseNote).trim());
  return parts.join("\n\n").slice(0, 5000);
}

/** Map one Discovery API event onto the EventSphere shape. */
function mapEvent(raw) {
  if (!raw || !raw.id || !raw.name) return null;

  const start = raw.dates && raw.dates.start;
  const iso = start && (start.dateTime || start.localDate);
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  // Discovery API flags date-only listings with dateTBA/timeTBA.
  const hasTime = Boolean(start.dateTime) && start.timeTBA !== true && start.noSpecificTime !== true;

  const venue = raw._embedded && Array.isArray(raw._embedded.venues) ? raw._embedded.venues[0] : null;
  const venueName = venue && venue.name ? String(venue.name).trim() : "";
  const cityName = venue && venue.city && venue.city.name ? String(venue.city.name).trim() : "";
  const countryName = venue && venue.country && venue.country.name ? String(venue.country.name).trim() : "";

  const lat = venue && venue.location ? Number(venue.location.latitude) : NaN;
  const lon = venue && venue.location ? Number(venue.location.longitude) : NaN;

  const endIso = raw.dates && raw.dates.end && (raw.dates.end.dateTime || raw.dates.end.localDate);
  const endDate = endIso ? new Date(endIso) : null;

  const location = [venueName, cityName].filter(Boolean).join(", ") || cityName || "Venue TBA";

  return {
    source: SOURCE,
    sourceId: String(raw.id),
    name: String(raw.name).trim().slice(0, 160),
    date,
    endDate: endDate && !Number.isNaN(endDate.getTime()) && endDate > date ? endDate : undefined,
    timezone: (raw.dates && raw.dates.timezone) || "",
    hasTime,
    location: location.slice(0, 200),
    venue: venueName.slice(0, 200),
    city: cityName.slice(0, 100),
    country: countryName.slice(0, 100),
    coordinates:
      Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined,
    isOnline: false,
    description: buildDescription(raw, venueName, cityName),
    category: pickCategory(raw.classifications),
    tags: pickTags(raw.classifications),
    image: pickImage(raw.images),
    url: typeof raw.url === "string" ? raw.url.slice(0, 500) : "",
    price: pickPrice(raw.priceRanges),
  };
}

async function fetchCity(city, apiKey, startISO) {
  const results = [];

  for (let page = 0; page < MAX_PAGES_PER_CITY; page++) {
    const params = new URLSearchParams({
      apikey: apiKey,
      city,
      size: String(PAGE_SIZE),
      page: String(page),
      sort: "date,asc",
      startDateTime: startISO,
    });

    const data = await fetchJson(`${BASE}?${params}`, { timeoutMs: 20000, retries: 2 });
    const events = (data && data._embedded && data._embedded.events) || [];
    for (const raw of events) {
      const mapped = mapEvent(raw);
      if (mapped) results.push(mapped);
    }

    const totalPages = (data && data.page && data.page.totalPages) || 0;
    if (events.length < PAGE_SIZE || page + 1 >= totalPages) break;
    await sleep(REQUEST_GAP_MS);
  }

  return results;
}

async function fetchEvents() {
  const apiKey = env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    const err = new Error("TICKETMASTER_API_KEY is not set");
    err.skipped = true;
    throw err;
  }

  // Discovery API wants UTC without milliseconds.
  const startISO = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const byId = new Map();

  for (const city of env.SYNC_CITIES) {
    try {
      const events = await fetchCity(city, apiKey, startISO);
      // The same event can surface for neighbouring cities — dedupe by id.
      for (const e of events) byId.set(e.sourceId, e);
    } catch (err) {
      // One bad city should not sink the whole provider.
      console.warn(`[sync:ticketmaster] city "${city}" failed — ${err.message}`);
      if (err.status === 401) throw err; // bad key: stop immediately
    }
    await sleep(REQUEST_GAP_MS);
  }

  return [...byId.values()];
}

module.exports = {
  name: SOURCE,
  label: "Ticketmaster",
  fetchEvents,
  requiresKey: true,
  isConfigured: () => Boolean(env.TICKETMASTER_API_KEY),
  _mapEvent: mapEvent, // exported for tests
};
