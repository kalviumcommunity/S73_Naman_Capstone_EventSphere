import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import EventCard from "../components/EventCard";

const API_URL = import.meta.env.VITE_API_URL;

export default function BookmarksPage() {
    const { user } = useAuth();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user) return;
            try {
                const res = await axios.get(
                    `${API_URL}/api/users/${user.id}/bookmarks`
                );
                setBookmarks(res.data);
            } catch (err) {
                console.error("Error fetching bookmarks:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookmarks();
    }, [user]);

    return (
        <div className="bookmarks-page">
            <div className="page-header">
                <h1>
                    <span className="page-icon">★</span> My Bookmarks
                </h1>
                <p className="page-subtitle">
                    Events you&apos;ve saved for later
                </p>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your bookmarks...</p>
                </div>
            ) : bookmarks.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📌</span>
                    <h3>No bookmarks yet</h3>
                    <p>
                        Start exploring events and bookmark the ones you&apos;re interested
                        in!
                    </p>
                </div>
            ) : (
                <div className="events-grid">
                    {bookmarks.map((event) => (
                        <EventCard key={event._id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}
