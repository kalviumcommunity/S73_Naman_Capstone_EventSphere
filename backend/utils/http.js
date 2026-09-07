/**
 * fetch() with a timeout and bounded exponential backoff.
 * Retries transient failures (network errors, 429, 5xx) only — a 4xx such as a
 * bad API key is permanent, so retrying just wastes the sync window.
 */
async function fetchJson(url, { timeoutMs = 20000, retries = 2, headers = {} } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "EventSphere/2.0", ...headers },
      });

      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const body = await res.text().catch(() => "");
        const err = new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
        err.status = res.status;
        if (!retryable) throw err;
        lastError = err;
      } else {
        return await res.json();
      }
    } catch (err) {
      if (err.status && err.status < 500 && err.status !== 429) throw err;
      lastError = err;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
 * Same retry semantics as fetchJson but returns decoded text. `encoding` lets
 * us read legacy feeds (NYC Parks is iso-8859-1) without mojibake.
 */
async function fetchText(url, { timeoutMs = 20000, retries = 2, encoding = "utf-8", headers = {} } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "EventSphere/2.0", ...headers },
      });

      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        if (!retryable) throw err;
        lastError = err;
      } else {
        const buf = await res.arrayBuffer();
        return new TextDecoder(encoding).decode(buf);
      }
    } catch (err) {
      if (err.status && err.status < 500 && err.status !== 429) throw err;
      lastError = err;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { fetchJson, fetchText, sleep };
