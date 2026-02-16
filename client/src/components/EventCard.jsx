import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  const categoryColors = {
    Music: "#a855f7",
    Sports: "#22c55e",
    Tech: "#3b82f6",
    Art: "#f97316",
    Food: "#ef4444",
    Business: "#6366f1",
    Other: "#64748b",
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Link to={`/events/${event._id}`} className="event-card-link">
      <div className="event-card">
        <div className="event-card-header">
          <span
            className="event-category-badge"
            style={{ backgroundColor: categoryColors[event.category] || "#64748b" }}
          >
            {event.category || "Other"}
          </span>
          <span className="event-date">{formatDate(event.date)}</span>
        </div>
        <h3 className="event-card-title">{event.name}</h3>
        <p className="event-card-location">
          <span className="location-icon">📍</span>
          {event.location}
        </p>
        {event.description && (
          <p className="event-card-desc">
            {event.description.length > 120
              ? event.description.substring(0, 120) + "..."
              : event.description}
          </p>
        )}
        <div className="event-card-footer">
          <span className="view-details">View Details →</span>
        </div>
      </div>
    </Link>
  );
}
