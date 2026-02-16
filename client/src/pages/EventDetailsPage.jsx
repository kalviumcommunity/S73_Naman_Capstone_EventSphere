import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function EventDetailsPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/events/${id}`);
                setEvent(res.data);
            } catch (err) {
                console.error("Error fetching event", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    // Check if event is bookmarked
    useEffect(() => {
        if (user && event) {
            const checkBookmark = async () => {
                try {
                    const res = await axios.get(
                        `${API_URL}/api/users/${user.id}/bookmarks`
                    );
                    const bookmarkedIds = res.data.map((e) => e._id);
                    setIsBookmarked(bookmarkedIds.includes(event._id));
                } catch (err) {
                    // Silent fail – user might not be authenticated
                }
            };
            checkBookmark();
        }
    }, [user, event]);

    const handleBookmark = async () => {
        if (!user) {
            navigate("/login");
            return;
        }

        setBookmarkLoading(true);
        try {
            if (isBookmarked) {
                await axios.delete(
                    `${API_URL}/api/users/${user.id}/bookmark/${event._id}`
                );
                setIsBookmarked(false);
            } else {
                await axios.post(
                    `${API_URL}/api/users/${user.id}/bookmark/${event._id}`
                );
                setIsBookmarked(true);
            }
        } catch (err) {
            console.error("Bookmark error:", err);
        } finally {
            setBookmarkLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;

        try {
            await axios.delete(`${API_URL}/api/events/${event._id}`);
            navigate("/");
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const categoryColors = {
        Music: "#a855f7",
        Sports: "#22c55e",
        Tech: "#3b82f6",
        Art: "#f97316",
        Food: "#ef4444",
        Business: "#6366f1",
        Other: "#64748b",
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading event details...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="empty-state">
                <span className="empty-icon">😕</span>
                <h3>Event not found</h3>
                <p>This event may have been removed or doesn&apos;t exist.</p>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const isCreator = user && event.createdBy && (event.createdBy._id === user.id || event.createdBy === user.id);

    return (
        <div className="event-details-page">
            <div className="event-details-card">
                <div className="event-details-top">
                    <span
                        className="event-category-badge large"
                        style={{
                            backgroundColor: categoryColors[event.category] || "#64748b",
                        }}
                    >
                        {event.category || "Other"}
                    </span>
                    <button
                        className={`bookmark-btn ${isBookmarked ? "bookmarked" : ""}`}
                        onClick={handleBookmark}
                        disabled={bookmarkLoading}
                    >
                        {bookmarkLoading
                            ? "..."
                            : isBookmarked
                                ? "★ Bookmarked"
                                : "☆ Bookmark"}
                    </button>
                </div>

                <h1 className="event-details-title">{event.name}</h1>

                <div className="event-details-meta">
                    <div className="meta-item">
                        <span className="meta-icon">📅</span>
                        <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-icon">📍</span>
                        <span>{event.location}</span>
                    </div>
                    {event.createdBy && event.createdBy.name && (
                        <div className="meta-item">
                            <span className="meta-icon">👤</span>
                            <span>Hosted by {event.createdBy.name}</span>
                        </div>
                    )}
                </div>

                {event.description && (
                    <div className="event-details-description">
                        <h3>About this Event</h3>
                        <p>{event.description}</p>
                    </div>
                )}

                {isCreator && (
                    <div className="event-details-actions">
                        <button className="delete-btn" onClick={handleDelete}>
                            🗑 Delete Event
                        </button>
                    </div>
                )}

                <button className="back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
            </div>
        </div>
    );
}
