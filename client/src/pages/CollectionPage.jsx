import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import EventGrid, { EventGridSkeleton } from "../components/events/EventGrid";
import { Button, Alert, EmptyState, ConfirmDialog } from "../components/ui";
import { IconBookmark, IconTicket, IconCalendar, IconEdit, IconTrash, IconPlus } from "../components/ui/Icons";
import { useBookmarkToggle, patchEvents } from "../lib/useBookmarks";

/**
 * One component behind /bookmarks, /attending and /my-events — the three pages
 * differ only in their endpoint and empty state, not their behaviour.
 */
const VARIANTS = {
  bookmarks: {
    endpoint: "/api/me/bookmarks",
    title: "Saved events",
    subtitle: "Everything you've bookmarked, soonest first.",
    emptyIcon: IconBookmark,
    emptyTitle: "Nothing saved yet",
    emptyBody: "Tap the bookmark icon on any event to keep it here.",
  },
  attending: {
    endpoint: "/api/me/attending",
    title: "Going to",
    subtitle: "Events you've RSVP'd to.",
    emptyIcon: IconTicket,
    emptyTitle: "No RSVPs yet",
    emptyBody: "When you mark yourself as going to an event, it shows up here.",
  },
  mine: {
    endpoint: "/api/events/mine",
    title: "My events",
    subtitle: "Events you've published on EventSphere.",
    emptyIcon: IconCalendar,
    emptyTitle: "You haven't posted an event",
    emptyBody: "Know something happening locally? Add it and it appears in search immediately.",
    owner: true,
  },
};

export default function CollectionPage({ variant }) {
  const config = VARIANTS[variant];
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toggleBookmark = useBookmarkToggle(patchEvents(setEvents));

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(config.endpoint, { signal });
        setEvents(data.events);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError(errorMessage(err, "Could not load these events."));
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // On the bookmarks page, un-bookmarking should remove the card entirely.
  const handleBookmarkToggle = async (event) => {
    await toggleBookmark(event);
    if (variant === "bookmarks") {
      setEvents((current) => current.filter((e) => e._id !== event._id));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/events/${pendingDelete._id}`);
      setEvents((current) => current.filter((e) => e._id !== pendingDelete._id));
      toast.success("Event deleted.");
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete that event."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">{config.title}</h1>
        <p className="page-head__sub">{config.subtitle}</p>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <EventGridSkeleton count={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={config.emptyIcon}
          title={config.emptyTitle}
          action={
            config.owner ? (
              <Link to="/create-event" className="btn btn--primary">
                <span className="btn__icon"><IconPlus /></span>
                Add an event
              </Link>
            ) : (
              <Link to="/" className="btn btn--primary">Browse events</Link>
            )
          }
        >
          {config.emptyBody}
        </EmptyState>
      ) : (
        <>
          <p className="results-bar__count" style={{ marginBottom: "var(--space-4)" }}>
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>

          <EventGrid
            events={events}
            onToggleBookmark={config.owner ? undefined : handleBookmarkToggle}
            renderExtra={
              config.owner
                ? (event) => (
                    <>
                      <Link to={`/events/${event._id}/edit`} className="btn btn--secondary btn--sm">
                        <span className="btn__icon"><IconEdit /></span>
                        Edit
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={IconTrash}
                        onClick={() => setPendingDelete(event)}
                      >
                        Delete
                      </Button>
                    </>
                  )
                : undefined
            }
          />
        </>
      )}

      <div style={{ marginBottom: "var(--space-8)" }} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this event?"
        body={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed permanently and cleared from everyone's saved list.`
            : ""
        }
        confirmLabel="Delete event"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
