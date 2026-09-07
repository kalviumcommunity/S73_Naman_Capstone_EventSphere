import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Badge, Alert, Spinner, EmptyState, ConfirmDialog, categoryStyle } from "../components/ui";
import EventGrid from "../components/events/EventGrid";
import {
  IconPin, IconCalendar, IconClock, IconBookmark, IconUsers, IconCheck,
  IconShare, IconDownload, IconExternal, IconArrowLeft, IconGlobe,
  IconTicket, IconEdit, IconTrash,
} from "../components/ui/Icons";
import {
  formatDateRange, formatTime, formatPrice, relativeDay, initials,
  timezoneLabel, SOURCE_LABELS,
} from "../lib/format";
import { downloadIcs, mapUrl } from "../lib/calendar";

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user, setBookmarkCount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setImageFailed(false);

    api
      .get(`/api/events/${id}`, { signal: controller.signal })
      .then(({ data }) => setEvent(data))
      .catch((err) => {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError(
          err.response?.status === 404
            ? "notfound"
            : errorMessage(err, "Could not load this event.")
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id, user]);

  useEffect(() => {
    if (!event) return undefined;
    const controller = new AbortController();
    api
      .get(`/api/events/${id}/similar`, { signal: controller.signal })
      .then(({ data }) => setSimilar(data.events))
      .catch(() => setSimilar([]));
    return () => controller.abort();
  }, [id, event]);

  const requireAuth = useCallback(
    (message) => {
      if (user) return true;
      toast.info(message);
      navigate("/login", { state: { from: `/events/${id}` } });
      return false;
    },
    [user, toast, navigate, id]
  );

  const toggleBookmark = async () => {
    if (!requireAuth("Sign in to save events.")) return;

    const next = !event.isBookmarked;
    setEvent((e) => ({ ...e, isBookmarked: next }));
    setBusy("bookmark");

    try {
      const { data } = next
        ? await api.post(`/api/me/bookmarks/${event._id}`)
        : await api.delete(`/api/me/bookmarks/${event._id}`);
      setBookmarkCount(data.bookmarkCount);
      toast.success(next ? "Saved to your list." : "Removed from saved.");
    } catch (err) {
      setEvent((e) => ({ ...e, isBookmarked: !next }));
      toast.error(errorMessage(err, "Could not update your saved events."));
    } finally {
      setBusy(null);
    }
  };

  const toggleAttend = async () => {
    if (!requireAuth("Sign in to RSVP.")) return;
    setBusy("attend");

    try {
      const { data } = event.isAttending
        ? await api.delete(`/api/events/${event._id}/attend`)
        : await api.post(`/api/events/${event._id}/attend`);
      setEvent((e) => ({ ...e, isAttending: data.attending, attendeeCount: data.attendeeCount }));
      toast.success(data.attending ? "You're going!" : "RSVP cancelled.");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update your RSVP."));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = window.location.href;
    const payload = { title: event.name, text: `${event.name} — ${event.location}`, url };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch (err) {
      // A dismissed share sheet is not an error worth reporting.
      if (err?.name !== "AbortError") toast.error("Could not share this event.");
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      await api.delete(`/api/events/${event._id}`);
      toast.success("Event deleted.");
      navigate("/my-events");
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete this event."));
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  if (loading) return <Spinner label="Loading event…" />;

  if (error === "notfound" || (!event && !error)) {
    return (
      <div className="container section">
        <EmptyState icon={IconTicket} title="Event not found" action={<Link to="/" className="btn btn--primary">Browse events</Link>}>
          This event may have finished, been removed, or never existed.
        </EmptyState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container section">
        <Alert>{error}</Alert>
      </div>
    );
  }

  const tzOpts = { timezone: event.timezone, hasTime: event.hasTime };
  const time = formatTime(event.date, tzOpts);
  const endTime = event.endDate ? formatTime(event.endDate, tzOpts) : null;
  // Only shown when the venue sits in a different zone from the viewer.
  const tzName = timezoneLabel(event.date, event.timezone);
  const price = formatPrice(event.price);
  const when = relativeDay(event.date);
  const place = [event.venue, event.city, event.country].filter(Boolean).join(", ") || event.location;
  const sourceLabel = SOURCE_LABELS[event.source] || "Community";

  return (
    <div className="container detail" style={categoryStyle(event.category)}>
      <button className="detail__back" onClick={() => navigate(-1)}>
        <IconArrowLeft /> Back
      </button>

      <div className="detail__hero">
        {event.image && !imageFailed ? (
          <img src={event.image} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <div className="detail__hero-fallback"><IconTicket /></div>
        )}
      </div>

      <div className="detail__layout">
        <div>
          <div className="detail__badges">
            <Badge variant="category" category={event.category}>{event.category}</Badge>
            {event.isPast ? (
              <Badge variant="past">Finished</Badge>
            ) : (
              <Badge variant="soon">{when}</Badge>
            )}
            {event.isOnline && <Badge>Online</Badge>}
            {event.price?.isFree && <Badge variant="free">Free entry</Badge>}
            <Badge>via {sourceLabel}</Badge>
          </div>

          <h1 className="detail__title">{event.name}</h1>

          <div className="detail__lede">
            <span className="detail__lede-item">
              <IconCalendar />
              {formatDateRange(event.date, event.endDate, event.timezone)}
            </span>
            {time && (
              <span className="detail__lede-item">
                <IconClock />
                {time}{endTime ? ` – ${endTime}` : ""}
                {tzName ? ` ${tzName}` : ""}
              </span>
            )}
            <span className="detail__lede-item">
              {event.isOnline ? <IconGlobe /> : <IconPin />}
              {event.isOnline ? "Online event" : place}
            </span>
          </div>

          {event.description && (
            <section className="detail__section">
              <h2>About this event</h2>
              <p className="detail__prose">{event.description}</p>
              {event.tags?.length > 0 && (
                <div className="detail__tags">
                  {event.tags.map((tag) => (
                    <span className="tag" key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="detail__section">
            <h2>Where</h2>
            {event.isOnline ? (
              <p className="detail__prose">
                This event takes place online. Use the event link for joining details.
              </p>
            ) : (
              <>
                <p className="detail__prose">{place}</p>
                <a
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: "var(--space-3)" }}
                  href={mapUrl(event)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="btn__icon"><IconExternal /></span>
                  View on map
                </a>
              </>
            )}
          </section>

          {event.createdBy?.name && (
            <section className="detail__section">
              <h2>Organiser</h2>
              <div className="host">
                <span className="avatar avatar--lg">{initials(event.createdBy.name)}</span>
                <div className="host__meta">
                  <p className="host__name">{event.createdBy.name}</p>
                  <p className="host__role">Posted this event on EventSphere</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="detail__aside">
          <div className="action-card">
            <p className="action-card__price">{price || "See event page"}</p>
            <p className="action-card__when">
              {formatDateRange(event.date, event.endDate, event.timezone)}
              {time ? ` · ${time}${tzName ? ` ${tzName}` : ""}` : ""}
            </p>

            <div className="action-card__actions">
              {!event.isPast && (
                <Button
                  variant={event.isAttending ? "secondary" : "primary"}
                  icon={event.isAttending ? IconCheck : IconTicket}
                  onClick={toggleAttend}
                  loading={busy === "attend"}
                  block
                >
                  {event.isAttending ? "You're going" : "I'm going"}
                </Button>
              )}

              {event.url && (
                <a className="btn btn--secondary btn--block" href={event.url} target="_blank" rel="noreferrer noopener">
                  <span className="btn__icon"><IconExternal /></span>
                  Official event page
                </a>
              )}

              <div className="action-card__row">
                <Button
                  variant="ghost"
                  icon={IconBookmark}
                  onClick={toggleBookmark}
                  loading={busy === "bookmark"}
                  aria-pressed={event.isBookmarked}
                >
                  {event.isBookmarked ? "Saved" : "Save"}
                </Button>
                <Button variant="ghost" icon={IconShare} onClick={share}>Share</Button>
              </div>

              <Button variant="ghost" icon={IconDownload} onClick={() => downloadIcs(event)} block>
                Add to calendar
              </Button>
            </div>

            {event.attendeeCount > 0 && (
              <p className="attendees">
                <IconUsers style={{ width: 16, height: 16 }} />
                <b>{event.attendeeCount}</b> {event.attendeeCount === 1 ? "person is" : "people are"} going
              </p>
            )}
          </div>

          {event.isOwner && (
            <div className="action-card">
              <p className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>Organiser tools</p>
              <div className="action-card__actions">
                <Link to={`/events/${event._id}/edit`} className="btn btn--secondary btn--block">
                  <span className="btn__icon"><IconEdit /></span>
                  Edit event
                </Link>
                <Button variant="danger" icon={IconTrash} onClick={() => setConfirmDelete(true)} block>
                  Delete event
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section style={{ marginTop: "var(--space-8)" }}>
          <div className="section-head">
            <div>
              <h2 className="section-head__title">You might also like</h2>
              <p className="section-head__sub">More {event.category.toLowerCase()} events coming up</p>
            </div>
          </div>
          <EventGrid events={similar} compact />
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        body="This permanently removes the event and clears it from everyone's saved list. This cannot be undone."
        confirmLabel="Delete event"
        destructive
        loading={busy === "delete"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
