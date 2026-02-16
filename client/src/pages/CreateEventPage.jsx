import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const CATEGORIES = ["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"];

export default function CreateEventPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        date: "",
        location: "",
        description: "",
        category: "Other",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/events`, form);
            navigate("/");
        } catch (err) {
            const errMsg =
                err.response?.data?.errors?.[0]?.msg ||
                err.response?.data?.error ||
                "Failed to create event";
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-event-page">
            <div className="create-event-card">
                <div className="auth-header">
                    <span className="auth-icon">🎉</span>
                    <h2>Create New Event</h2>
                    <p>Share your event with the community</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form create-form">
                    <div className="form-group">
                        <label htmlFor="name">Event Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="e.g. Music Festival 2026"
                            value={form.name}
                            onChange={handleChange}
                            required
                            minLength={3}
                            maxLength={100}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="date">Date</label>
                            <input
                                id="date"
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="form-select"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="location">Location</label>
                        <input
                            id="location"
                            name="location"
                            type="text"
                            placeholder="e.g. Central Park, New York"
                            value={form.location}
                            onChange={handleChange}
                            required
                            minLength={2}
                            maxLength={100}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Tell people about your event..."
                            value={form.description}
                            onChange={handleChange}
                            rows={4}
                            maxLength={500}
                            className="form-textarea"
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? "Creating..." : "Create Event"}
                    </button>
                </form>
            </div>
        </div>
    );
}
