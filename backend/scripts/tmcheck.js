/**
 * Ticketmaster key + coverage check.
 *
 * Validates TICKETMASTER_API_KEY and reports how many upcoming events each
 * city in SYNC_CITIES actually returns, so a city with no coverage can be
 * spotted before it silently contributes nothing to every sync.
 *
 *   node backend/scripts/tmcheck.js            # checks SYNC_CITIES
 *   node backend/scripts/tmcheck.js Pune Goa   # checks the cities you name
 */
const env = require("../config/env");
const { fetchJson, sleep } = require("../utils/http");

const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

async function countFor(city, apiKey, startISO) {
  const params = new URLSearchParams({
    apikey: apiKey,
    city,
    size: "1",
    startDateTime: startISO,
  });

  const data = await fetchJson(`${BASE}?${params}`, { timeoutMs: 20000, retries: 1 });
  const total = (data && data.page && data.page.totalElements) || 0;
  const sample = data && data._embedded && data._embedded.events && data._embedded.events[0];

  return {
    total,
    sample: sample
      ? `${sample.name} — ${(sample.dates?.start?.localDate) || "date TBA"}`
      : null,
  };
}

(async () => {
  const apiKey = env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    console.error("\nTICKETMASTER_API_KEY is empty in backend/.env.\n");
    console.error("Paste your app's Consumer Key (not the Consumer Secret) from");
    console.error("https://developer.ticketmaster.com/account/#/apps\n");
    process.exit(1);
  }

  console.log(`Key loaded: ${apiKey.slice(0, 4)}…${apiKey.slice(-4)} (${apiKey.length} chars)\n`);

  const startISO = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // Validate the key once before fanning out across cities.
  try {
    await countFor("London", apiKey, startISO);
    console.log("Key is valid.\n");
  } catch (err) {
    if (err.status === 401) {
      console.error("The API key was rejected (401).\n");
      console.error("Check that you copied the Consumer Key, not the Consumer Secret.");
      console.error("A newly created key can also take a few minutes to activate.\n");
    } else {
      console.error(`Could not reach Ticketmaster: ${err.message}\n`);
    }
    process.exit(1);
  }

  const cities = process.argv.slice(2).length ? process.argv.slice(2) : env.SYNC_CITIES;
  console.log(`Checking ${cities.length} cities\n`);

  const covered = [];
  const empty = [];

  for (const city of cities) {
    try {
      const { total, sample } = await countFor(city, apiKey, startISO);
      const label = String(total).padStart(6);
      console.log(`${label}  ${city}`);
      if (sample) console.log(`        e.g. ${sample}`);
      (total > 0 ? covered : empty).push(city);
    } catch (err) {
      console.log(`  err   ${city} — ${err.message.slice(0, 80)}`);
      empty.push(city);
    }
    await sleep(250); // stay inside the 5 req/sec limit
  }

  console.log(`\n${covered.length} of ${cities.length} cities have upcoming events.`);

  if (empty.length) {
    console.log(`\nNo coverage: ${empty.join(", ")}`);
    console.log("Ticketmaster does not operate everywhere. Drop these from");
    console.log("SYNC_CITIES so each sync does not spend requests on them.\n");
    console.log("Suggested SYNC_CITIES line for backend/.env:");
    console.log(`SYNC_CITIES=${covered.join(",")}`);
  }

  console.log("\nNext: npm run sync\n");
})().catch((err) => {
  console.error("Check failed:", err.message);
  process.exit(1);
});
