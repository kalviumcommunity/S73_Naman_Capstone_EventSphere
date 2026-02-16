import { useState, useEffect } from "react";
import axios from "axios";
import EventCard from "../components/EventCard";

const API_URL = import.meta.env.VITE_API_URL || "";
const CATEGORIES = ["All", "Music", "Sports", "Tech", "Art", "Food", "Business", "Other"];

export default function HomePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("All");
    const [searchInput, setSearchInput] = useState("");

    const fetchEvents = async (params = {}) => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (params.keyword) query.set("keyword", params.keyword);
            if (params.category && params.category !== "All")
                query.set("category", params.category);

            const res = await axios.get(`${API_URL}/api/events?${query.toString()}`);
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching events:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents({ keyword, category });
    }, [keyword, category]);

    const handleSearch = (e) => {
        e.preventDefault();
        setKeyword(searchInput);
    };

    const handleCategoryChange = (cat) => {
        setCategory(cat);
    };

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Discover <span className="gradient-text">Amazing Events</span>
                        <br />Near You
                    </h1>
                    <p className="hero-subtitle">
                        Explore local events in music, sports, tech, art, food and more.
                        Bookmark your favorites and never miss out.
                    </p>

                    {/* Search Bar */}
                    <form className="search-container" onSubmit={handleSearch}>
                        <div className="search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search events by name or keyword..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="search-btn">
                            Search
                        </button>
                    </form>
                </div>
                <div className="hero-glow"></div>
            </section>

            {/* Category Filter */}
            <section className="category-section">
                <div className="category-filter">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`category-btn ${category === cat ? "active" : ""}`}
                            onClick={() => handleCategoryChange(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            {/* Events Grid */}
            <section className="events-section">
                <h2 className="section-title">
                    {category !== "All" ? `${category} Events` : "Upcoming Events"}
                    {keyword && ` matching "${keyword}"`}
                </h2>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🎭</span>
                        <h3>No events found</h3>
                        <p>Try adjusting your search or category filter</p>
                    </div>
                ) : (
                    <div className="events-grid">
                        {events.map((event) => (
                            <EventCard key={event._id} event={event} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
