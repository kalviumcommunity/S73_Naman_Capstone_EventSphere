import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { Spinner } from "./components/ui";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import EventFormPage from "./pages/EventFormPage";
import CollectionPage from "./pages/CollectionPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the boot-time token check before deciding, otherwise a signed-in
  // user is bounced to /login on every hard refresh.
  if (loading) return <Spinner label="Loading…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

/** Reset scroll on navigation — the browser restores it on client routes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Navbar />

      <main className="app-main" id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />

          <Route
            path="/events/:id/edit"
            element={<ProtectedRoute><EventFormPage mode="edit" /></ProtectedRoute>}
          />
          <Route
            path="/create-event"
            element={<ProtectedRoute><EventFormPage mode="create" /></ProtectedRoute>}
          />
          <Route
            path="/bookmarks"
            element={<ProtectedRoute><CollectionPage variant="bookmarks" /></ProtectedRoute>}
          />
          <Route
            path="/attending"
            element={<ProtectedRoute><CollectionPage variant="attending" /></ProtectedRoute>}
          />
          <Route
            path="/my-events"
            element={<ProtectedRoute><CollectionPage variant="mine" /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
