import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

/** Formats the last successful ingestion as "updated 3 hours ago". */
function freshness(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 2) return "updated just now";
  if (minutes < 60) return `updated ${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `updated ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `updated ${days} day${days === 1 ? "" : "s"} ago`;
}

export default function Footer() {
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/stats")
      .then(({ data }) => {
        if (!cancelled) setLastSync(data.lastSyncedAt);
      })
      .catch(() => {
        // A missing freshness line is not worth surfacing to the user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updated = freshness(lastSync);

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <p className="footer__note">
            EventSphere — real events from Ticketmaster, developers.events and NYC Parks.
          </p>
          <p className="footer__note">
            Catalogue refreshes daily{updated ? `, ${updated}` : ""}.
          </p>
        </div>

        <nav className="footer__links" aria-label="Footer">
          <Link to="/">Discover</Link>
          <Link to="/create-event">Add an event</Link>
          <a href="/api/health" target="_blank" rel="noreferrer">API status</a>
        </nav>
      </div>
    </footer>
  );
}
