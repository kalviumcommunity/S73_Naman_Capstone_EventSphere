import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, categoryStyle } from "../ui";
import { IconPin, IconBookmark, IconUsers, IconGlobe, IconTicket } from "../ui/Icons";
import { dateParts, formatDateShort, formatTime, formatPrice, relativeDay, truncate } from "../../lib/format";

/** Category glyph used when an event has no cover image. */
function FallbackCover() {
  return (
    <div className="event-card__fallback">
      <IconTicket />
    </div>
  );
}

export default function EventCard({ event, index = 0, onToggleBookmark, showOwnerBar, children }) {
  const [imageFailed, setImageFailed] = useState(false);

  const { day, month } = dateParts(event.date, event.timezone);
  const time = formatTime(event.date, { timezone: event.timezone, hasTime: event.hasTime });
  const price = formatPrice(event.price);
  const when = relativeDay(event.date);
  const isSoon = ["Today", "Tomorrow"].includes(when);

  const place = event.isOnline
    ? "Online"
    : [event.venue, event.city].filter(Boolean).join(", ") || event.location;

  return (
    <article
      className="event-card"
      style={{ ...categoryStyle(event.category), animationDelay: `${Math.min(index, 11) * 35}ms` }}
    >
      <div className="event-card__media">
        {event.image && !imageFailed ? (
          <img
            className="event-card__img"
            src={event.image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <FallbackCover />
        )}

        <div className="event-card__date-chip">
          <span className="event-card__date-day">{day}</span>
          <span className="event-card__date-month">{month}</span>
        </div>

        {onToggleBookmark && (
          <button
            className="event-card__bookmark"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleBookmark(event);
            }}
            aria-pressed={Boolean(event.isBookmarked)}
            aria-label={event.isBookmarked ? `Remove ${event.name} from saved` : `Save ${event.name}`}
            title={event.isBookmarked ? "Remove from saved" : "Save for later"}
          >
            <IconBookmark filled={event.isBookmarked} />
          </button>
        )}
      </div>

      <div className="event-card__body">
        <div className="event-card__meta">
          <Badge variant="category" category={event.category}>{event.category}</Badge>
          {isSoon && <Badge variant="soon">{when}</Badge>}
          {event.isPast && <Badge variant="past">Finished</Badge>}
        </div>

        <h3 className="event-card__title">
          <Link to={`/events/${event._id}`} className="event-card__link">
            {event.name}
          </Link>
        </h3>

        <p className="event-card__where">
          {event.isOnline ? <IconGlobe /> : <IconPin />}
          <span>{place}</span>
        </p>

        {event.description && (
          <p className="event-card__desc">{truncate(event.description, 108)}</p>
        )}

        <div className="event-card__foot">
          <span>
            {formatDateShort(event.date, event.timezone)}
            {time ? ` · ${time}` : ""}
          </span>

          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            {event.attendeeCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <IconUsers style={{ width: 13, height: 13 }} />
                {event.attendeeCount}
              </span>
            )}
            {price && (
              <span className={`event-card__price${price === "Free" ? " event-card__price--free" : ""}`}>
                {price}
              </span>
            )}
          </span>
        </div>
      </div>

      {showOwnerBar && children && <div className="owner-bar">{children}</div>}
    </article>
  );
}
