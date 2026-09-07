import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/**
 * Bookmark toggling with an optimistic update.
 *
 * `applyLocal(eventId, isBookmarked)` lets each page patch whatever list it is
 * holding; the hook rolls the change back if the request fails.
 */
export function useBookmarkToggle(applyLocal) {
  const { user, setBookmarkCount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  return useCallback(
    async (event) => {
      if (!user) {
        toast.info("Sign in to save events.");
        navigate("/login", { state: { from: `/events/${event._id}` } });
        return;
      }

      const next = !event.isBookmarked;
      applyLocal(event._id, next);

      try {
        const { data } = next
          ? await api.post(`/api/me/bookmarks/${event._id}`)
          : await api.delete(`/api/me/bookmarks/${event._id}`);

        setBookmarkCount(data.bookmarkCount);
        toast.success(next ? "Saved to your list." : "Removed from saved.");
      } catch (err) {
        applyLocal(event._id, !next); // roll back
        toast.error(errorMessage(err, "Could not update your saved events."));
      }
    },
    [user, applyLocal, setBookmarkCount, toast, navigate]
  );
}

/** Patch a bookmark flag inside a list of events held in state. */
export function patchEvents(setEvents) {
  return (eventId, isBookmarked) =>
    setEvents((current) =>
      current.map((e) => (e._id === eventId ? { ...e, isBookmarked } : e))
    );
}
