import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setMenuOpen(false);
        navigate("/");
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
                    <span className="brand-icon">✦</span>
                    <span className="brand-text">EventSphere</span>
                </Link>

                <button
                    className={`hamburger ${menuOpen ? "active" : ""}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`nav-links ${menuOpen ? "open" : ""}`}>
                    <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                        Home
                    </Link>

                    {user ? (
                        <>
                            <Link to="/create-event" className="nav-link" onClick={() => setMenuOpen(false)}>
                                Create Event
                            </Link>
                            <Link to="/bookmarks" className="nav-link" onClick={() => setMenuOpen(false)}>
                                Bookmarks
                            </Link>
                            <div className="nav-user-section">
                                <span className="nav-user-name">{user.name}</span>
                                <button className="nav-logout-btn" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>
                                Login
                            </Link>
                            <Link to="/register" className="nav-link nav-cta" onClick={() => setMenuOpen(false)}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}