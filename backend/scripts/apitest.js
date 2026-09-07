/**
 * End-to-end API regression suite.
 *
 * Runs against a live server (default http://localhost:1369) and covers the
 * bugs found during the audit plus the new feature surface.
 *
 *   node backend/scripts/apitest.js [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:1369";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

async function api(method, path, { token, body, headers = {}, raw = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, contentType: res.headers.get("content-type") || "", raw: text };
}

(async () => {
  console.log(`EventSphere API tests -> ${BASE}\n${"=".repeat(50)}`);

  // ---------------------------------------------------------------- health
  section("Health & metadata");

  const health = await api("GET", "/api/health");
  check("GET /api/health returns 200", health.status === 200, `got ${health.status}`);
  check("health reports a connected database", health.data.database === "connected", health.data.database);

  const stats = await api("GET", "/api/stats");
  check("GET /api/stats returns totals", stats.status === 200 && typeof stats.data.total === "number");
  check("stats reports upcoming events", stats.data.upcoming > 0, `upcoming=${stats.data.upcoming}`);
  check("stats lists categories", Array.isArray(stats.data.categories) && stats.data.categories.length > 0);

  const cities = await api("GET", "/api/cities");
  check("GET /api/cities returns cities", cities.status === 200 && cities.data.cities.length > 0);

  const syncStatus = await api("GET", "/api/sync/status");
  check("GET /api/sync/status reports providers", syncStatus.status === 200 && syncStatus.data.providers.length === 3);
  check("sync status exposes the cron schedule", Boolean(syncStatus.data.schedule && syncStatus.data.schedule.cron));
  check("last sync recorded", Boolean(syncStatus.data.last), "no SyncLog found");

  // ------------------------------------------------------------ BUG: 404s
  section("Bug: API 404s were answered with 200 + index.html");

  const missing = await api("GET", "/api/does-not-exist");
  check("unknown API route returns 404", missing.status === 404, `got ${missing.status}`);
  check("unknown API route returns JSON", missing.contentType.includes("application/json"), missing.contentType);

  // ---------------------------------------------------- BUG: past events
  section("Bug: finished events listed under 'Upcoming'");

  const list = await api("GET", "/api/events?limit=48");
  check("GET /api/events is paginated", list.status === 200 && Array.isArray(list.data.events));
  check("response carries pagination metadata",
    typeof list.data.total === "number" && typeof list.data.pages === "number" && "hasMore" in list.data);
  const anyPast = list.data.events.filter((e) => new Date(e.date) < new Date());
  check("no finished events in the default feed", anyPast.length === 0, `${anyPast.length} past events returned`);
  check("attendee list is not exposed", list.data.events.every((e) => e.attendees === undefined));

  const withPast = await api("GET", "/api/events?includePast=true&limit=5");
  check("includePast=true is accepted", withPast.status === 200);

  // ---------------------------------------------- BUG: search ignored location
  section("Bug: keyword search ignored location");

  const byCity = await api("GET", "/api/events?keyword=New%20York&limit=5");
  check("keyword matches location text", byCity.data.total > 0, `total=${byCity.data.total}`);

  // An unescaped ".*" compiles to a match-everything regex. Escaped, it matches
  // only the handful of events whose text literally contains those characters.
  const all = await api("GET", "/api/events?limit=1");
  const injection = await api("GET", "/api/events?keyword=" + encodeURIComponent(".*"));
  check("regex metacharacters are escaped, not executed",
    injection.status === 200 && injection.data.total < all.data.total * 0.1,
    `matched ${injection.data.total} of ${all.data.total} (unescaped '.*' would match all)`);

  // ------------------------------------------------------------- filtering
  section("Filtering, sorting, pagination");

  const tech = await api("GET", "/api/events?category=Tech&limit=10");
  check("category filter works", tech.data.events.every((e) => e.category === "Tech"));

  const free = await api("GET", "/api/events?free=true&limit=10");
  check("free filter works", free.data.events.every((e) => e.price && e.price.isFree));

  const online = await api("GET", "/api/events?online=true&limit=10");
  check("online filter works", online.data.events.every((e) => e.isOnline === true));

  const p1 = await api("GET", "/api/events?limit=5&page=1");
  const p2 = await api("GET", "/api/events?limit=5&page=2");
  const overlap = p1.data.events.filter((a) => p2.data.events.some((b) => b._id === a._id));
  check("pages do not overlap", overlap.length === 0, `${overlap.length} shared items`);
  check("limit is honoured", p1.data.events.length === 5, `got ${p1.data.events.length}`);

  const badCategory = await api("GET", "/api/events?category=Nonsense");
  check("invalid category is rejected", badCategory.status === 400, `got ${badCategory.status}`);

  const overLimit = await api("GET", "/api/events?limit=9999");
  check("oversized limit is rejected", overLimit.status === 400, `got ${overLimit.status}`);

  const dateRange = await api("GET", "/api/events?dateFrom=2026-01-01&dateTo=2099-01-01&limit=5");
  check("date range filter works", dateRange.status === 200 && dateRange.data.total > 0);

  // ------------------------------------------------------------------ auth
  section("Authentication");

  const email = `test_${Date.now()}@example.com`;
  const reg = await api("POST", "/api/auth/register", {
    body: { name: "Test User", email, password: "secret123" },
  });
  check("register returns 201", reg.status === 201, `got ${reg.status}`);
  check("register returns a token (no second round-trip)", Boolean(reg.data.token));
  check("register never returns the password hash", !JSON.stringify(reg.data).includes("$2b$"));

  const token = reg.data.token;
  const userId = reg.data.user.id;

  const dupe = await api("POST", "/api/auth/register", {
    body: { name: "Test User", email, password: "secret123" },
  });
  check("duplicate email is rejected with 409", dupe.status === 409, `got ${dupe.status}`);

  const weak = await api("POST", "/api/auth/register", {
    body: { name: "X", email: `w${Date.now()}@e.com`, password: "123" },
  });
  check("short password is rejected", weak.status === 400);
  check("validation errors name the field", Array.isArray(weak.data.details) && weak.data.details.length > 0);

  const login = await api("POST", "/api/auth/login", { body: { email, password: "secret123" } });
  check("login succeeds", login.status === 200 && Boolean(login.data.token));

  const badLogin = await api("POST", "/api/auth/login", { body: { email, password: "wrongpass" } });
  check("wrong password is rejected", badLogin.status === 401);
  check("login error does not reveal whether the account exists",
    badLogin.data.error === "Invalid email or password.", badLogin.data.error);

  const me = await api("GET", "/api/auth/me", { token });
  check("GET /api/auth/me validates a stored token", me.status === 200 && me.data.user.email === email);

  const noToken = await api("GET", "/api/auth/me");
  check("protected route rejects a missing token", noToken.status === 401);

  const badToken = await api("GET", "/api/auth/me", { token: "not.a.jwt" });
  check("protected route rejects a malformed token", badToken.status === 401);

  // ------------------------------------------------------- event ownership
  section("Event creation & the ownership-hijack bug");

  const created = await api("POST", "/api/events", {
    token,
    body: {
      name: "Regression Test Event",
      date: new Date(Date.now() + 7 * 864e5).toISOString(),
      location: "Test Venue, Testville",
      city: "Testville",
      description: "Created by the API regression suite.",
      category: "Tech",
    },
  });
  check("create event returns 201", created.status === 201, JSON.stringify(created.data).slice(0, 120));
  const eventId = created.data._id;
  check("creator is marked as owner", created.data.isOwner === true);
  check("event is stamped source=user", created.data.source === "user");

  const hijack = await api("PUT", `/api/events/${eventId}`, {
    token,
    body: { createdBy: "000000000000000000000042", source: "ticketmaster", name: "Renamed" },
  });
  check("PUT accepts the whitelisted field", hijack.status === 200, `got ${hijack.status}`);
  check("createdBy cannot be reassigned via the body",
    hijack.data.createdBy && String(hijack.data.createdBy._id || hijack.data.createdBy) === String(userId),
    `createdBy=${JSON.stringify(hijack.data.createdBy)}`);
  check("source cannot be reassigned via the body", hijack.data.source === "user", hijack.data.source);
  check("owner retains control after the attempt", hijack.data.isOwner === true);

  const stillEditable = await api("PUT", `/api/events/${eventId}`, {
    token, body: { name: "Regression Test Event v2" },
  });
  check("owner can still edit afterwards", stillEditable.status === 200, `got ${stillEditable.status}`);

  const badDates = await api("POST", "/api/events", {
    token,
    body: {
      name: "Backwards Event",
      date: new Date(Date.now() + 10 * 864e5).toISOString(),
      endDate: new Date(Date.now() + 2 * 864e5).toISOString(),
      location: "Somewhere",
    },
  });
  check("end date before start date is rejected", badDates.status === 400, `got ${badDates.status}`);

  const anonCreate = await api("POST", "/api/events", {
    body: { name: "Anonymous", date: new Date().toISOString(), location: "Nowhere" },
  });
  check("anonymous event creation is rejected", anonCreate.status === 401);

  // A second user must not be able to edit or delete someone else's event.
  const other = await api("POST", "/api/auth/register", {
    body: { name: "Other User", email: `other_${Date.now()}@example.com`, password: "secret123" },
  });
  const otherToken = other.data.token;

  const foreignEdit = await api("PUT", `/api/events/${eventId}`, {
    token: otherToken, body: { name: "Stolen" },
  });
  check("another user cannot edit the event", foreignEdit.status === 403, `got ${foreignEdit.status}`);

  const foreignDelete = await api("DELETE", `/api/events/${eventId}`, { token: otherToken });
  check("another user cannot delete the event", foreignDelete.status === 403, `got ${foreignDelete.status}`);

  // Synced events are read-only.
  const syncedList = await api("GET", "/api/events?source=nycparks&limit=1");
  const syncedId = syncedList.data.events[0] && syncedList.data.events[0]._id;
  if (syncedId) {
    const editSynced = await api("PUT", `/api/events/${syncedId}`, { token, body: { name: "Hijacked" } });
    check("synced events cannot be edited", editSynced.status === 403, `got ${editSynced.status}`);
    const delSynced = await api("DELETE", `/api/events/${syncedId}`, { token });
    check("synced events cannot be deleted", delSynced.status === 403, `got ${delSynced.status}`);
  }

  const badId = await api("GET", "/api/events/not-an-objectid");
  check("malformed event id returns 400 not 500", badId.status === 400, `got ${badId.status}`);

  const absent = await api("GET", "/api/events/000000000000000000000099");
  check("unknown event id returns 404", absent.status === 404, `got ${absent.status}`);

  // --------------------------------------------------------------- bookmarks
  section("Bookmarks");

  const bm = await api("POST", `/api/me/bookmarks/${eventId}`, { token });
  check("bookmark an event", bm.status === 200 && bm.data.bookmarked === true);

  const bmList = await api("GET", "/api/me/bookmarks", { token });
  check("bookmark appears in the list", bmList.data.events.some((e) => e._id === eventId));

  const detail = await api("GET", `/api/events/${eventId}`, { token });
  check("event detail reports isBookmarked for the viewer", detail.data.isBookmarked === true);

  const anonDetail = await api("GET", `/api/events/${eventId}`);
  check("anonymous viewer sees isBookmarked=false", anonDetail.data.isBookmarked === false);

  const legacyBm = await api("GET", `/api/users/${userId}/bookmarks`, { token });
  check("legacy bookmark route still works", legacyBm.status === 200);

  const foreignBm = await api("GET", `/api/users/${userId}/bookmarks`, { token: otherToken });
  check("cannot read another user's bookmarks", foreignBm.status === 403, `got ${foreignBm.status}`);

  const unbm = await api("DELETE", `/api/me/bookmarks/${eventId}`, { token });
  check("remove a bookmark", unbm.status === 200 && unbm.data.bookmarked === false);

  // -------------------------------------------------------------------- RSVP
  section("RSVP / attendance");

  const rsvp = await api("POST", `/api/events/${eventId}/attend`, { token });
  check("RSVP to an event", rsvp.status === 200 && rsvp.data.attending === true);
  check("attendee count increments", rsvp.data.attendeeCount === 1, `count=${rsvp.data.attendeeCount}`);

  const rsvpAgain = await api("POST", `/api/events/${eventId}/attend`, { token });
  check("RSVP is idempotent", rsvpAgain.data.attendeeCount === 1, `count=${rsvpAgain.data.attendeeCount}`);

  const attending = await api("GET", "/api/me/attending", { token });
  check("attending list includes the event", attending.data.events.some((e) => e._id === eventId));

  const unrsvp = await api("DELETE", `/api/events/${eventId}/attend`, { token });
  check("cancel an RSVP", unrsvp.data.attending === false && unrsvp.data.attendeeCount === 0);

  // ------------------------------------------------------------------ profile
  section("Profile & personalisation");

  const patch = await api("PATCH", "/api/me", {
    token, body: { city: "Berlin", bio: "Testing.", interests: ["Tech", "Music"] },
  });
  check("update profile", patch.status === 200 && patch.data.user.city === "Berlin");
  check("interests persist", JSON.stringify(patch.data.user.interests) === JSON.stringify(["Tech", "Music"]));

  const badInterest = await api("PATCH", "/api/me", { token, body: { interests: ["Underwater Basketweaving"] } });
  check("unknown interest is rejected", badInterest.status === 400, `got ${badInterest.status}`);

  const forYou = await api("GET", "/api/events?forYou=true&limit=20", { token });
  check("forYou feed respects interests",
    forYou.data.events.every((e) => ["Tech", "Music"].includes(e.category)),
    "returned an off-interest category");

  const mine = await api("GET", "/api/events/mine", { token });
  check("my-events lists the created event", mine.data.events.some((e) => e._id === eventId));

  // ------------------------------------------------------------------ similar
  section("Related events");

  const similar = await api("GET", `/api/events/${eventId}/similar`);
  check("similar events returns a list", similar.status === 200 && Array.isArray(similar.data.events));
  check("similar excludes the event itself", !similar.data.events.some((e) => e._id === eventId));

  // ------------------------------------------------------ BUG: open upload
  section("Bug: uploads were unauthenticated and accepted SVG");

  const anonUpload = await fetch(`${BASE}/api/upload`, { method: "POST" });
  check("upload requires authentication", anonUpload.status === 401, `got ${anonUpload.status}`);

  const svg = new FormData();
  svg.append("image", new Blob(["<svg onload=alert(1) xmlns='http://www.w3.org/2000/svg'/>"],
    { type: "image/svg+xml" }), "x.svg");
  const svgUpload = await fetch(`${BASE}/api/upload`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: svg,
  });
  check("SVG upload is rejected (stored-XSS vector)", svgUpload.status === 400, `got ${svgUpload.status}`);

  const png = new FormData();
  // 1x1 transparent PNG
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  png.append("image", new Blob([pngBytes], { type: "image/png" }), "pixel.png");
  const pngUpload = await fetch(`${BASE}/api/upload`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: png,
  });
  const pngData = await pngUpload.json();
  check("PNG upload succeeds", pngUpload.status === 201, `got ${pngUpload.status}`);
  check("upload returns a servable URL", typeof pngData.url === "string" && pngData.url.startsWith("/uploads/"));

  if (pngData.url) {
    const fetched = await fetch(`${BASE}${pngData.url}`);
    check("uploaded file is servable from the static mount", fetched.status === 200, `got ${fetched.status}`);
    check("uploads are served with nosniff",
      fetched.headers.get("x-content-type-options") === "nosniff");
  }

  // -------------------------------------------------------------- admin sync
  section("Sync trigger guard");

  const unguarded = await api("POST", "/api/sync/run");
  check("manual sync is guarded (503 disabled or 401 unauthorised)",
    [401, 503].includes(unguarded.status), `got ${unguarded.status}`);

  // ----------------------------------------------------------------- cleanup
  section("Cleanup");

  const del = await api("DELETE", `/api/events/${eventId}`, { token });
  check("owner can delete their event", del.status === 200, `got ${del.status}`);

  const gone = await api("GET", `/api/events/${eventId}`);
  check("deleted event is gone", gone.status === 404);

  // ------------------------------------------------------------------ report
  console.log(`\n${"=".repeat(50)}`);
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) {
    console.log("\nFailed:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error("\nTest run crashed:", err);
  process.exit(1);
});
