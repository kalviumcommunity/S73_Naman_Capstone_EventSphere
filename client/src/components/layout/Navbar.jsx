import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { IconButton } from "../ui";
import { initials } from "../../lib/format";
import {
  IconSun, IconMoon, IconMenu, IconClose, IconBookmark,
  IconUser, IconLogout, IconCalendar, IconTicket, IconPlus,
} from "../ui/Icons";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef(null);

  // Close both menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dismiss the account menu on an outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return undefined;

    const onPointerDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    setMenuOpen(false);
    toast.success("Signed out.");
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link${isActive ? " nav-link--active" : ""}`;

  return (
    <nav className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
      <div className="container navbar__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3v3M16 3v3" />
              <rect x="4" y="5.5" width="16" height="15" rx="3" strokeWidth="1.9" />
              <circle cx="12" cy="13.5" r="2.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          EventSphere
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>

        <div className={`nav-links${menuOpen ? " nav-links--open" : ""}`}>
          <NavLink to="/" className={navLinkClass} end>Discover</NavLink>
          {user && <NavLink to="/bookmarks" className={navLinkClass}>Saved</NavLink>}
          {user && <NavLink to="/my-events" className={navLinkClass}>My events</NavLink>}

          <span className="nav-divider" aria-hidden="true" />

          <IconButton
            icon={resolved === "dark" ? IconSun : IconMoon}
            label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
            onClick={toggle}
          />

          {user ? (
            <>
              <Link to="/create-event" className="btn btn--primary btn--sm">
                <span className="btn__icon"><IconPlus /></span>
                Add event
              </Link>

              <div className="account" ref={accountRef}>
                <button
                  className="account__trigger"
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar">{initials(user.name)}</span>
                  <span className="account__name">{user.name.split(" ")[0]}</span>
                </button>

                {accountOpen && (
                  <div className="menu" role="menu">
                    <div className="menu__header">
                      <p className="menu__name">{user.name}</p>
                      <p className="menu__email">{user.email}</p>
                    </div>
                    <Link to="/profile" className="menu__item" role="menuitem">
                      <IconUser /> Profile &amp; interests
                    </Link>
                    <Link to="/bookmarks" className="menu__item" role="menuitem">
                      <IconBookmark /> Saved events
                    </Link>
                    <Link to="/attending" className="menu__item" role="menuitem">
                      <IconTicket /> Going to
                    </Link>
                    <Link to="/my-events" className="menu__item" role="menuitem">
                      <IconCalendar /> My events
                    </Link>
                    <button className="menu__item menu__item--danger" onClick={handleLogout} role="menuitem">
                      <IconLogout /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>Sign in</NavLink>
              <Link to="/register" className="btn btn--primary btn--sm">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
