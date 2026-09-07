import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container notfound">
      <div>
        <p className="notfound__code">404</p>
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-3)" }}>
          This page has moved on
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-5)", maxWidth: "44ch" }}>
          The link may be out of date, or the event it pointed to has finished and been
          cleared from the catalogue.
        </p>
        <Link to="/" className="btn btn--primary btn--lg">Browse events</Link>
      </div>
    </div>
  );
}
