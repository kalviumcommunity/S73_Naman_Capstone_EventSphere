import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Button, Field, Input, Textarea, Select, Alert } from "../components/ui";
import { IconSparkle } from "../components/ui/Icons";
import { initials } from "../lib/format";

const CATEGORIES = ["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"];
const MAX_BIO = 280;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.name || "",
    city: user?.city || "",
    bio: user?.bio || "",
  });
  const [interests, setInterests] = useState(user?.interests || []);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/me")
      .then(({ data }) => {
        if (!cancelled) setCounts(data.user);
      })
      .catch(() => {
        // The counters are supplementary; the form works without them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleInterest = (category) => {
    setInterests((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        city: form.city.trim(),
        bio: form.bio.trim(),
        interests,
      });
      toast.success("Profile saved.");
    } catch (err) {
      setError(errorMessage(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  const bioOver = form.bio.length > MAX_BIO;

  return (
    <div className="container container--narrow">
      <header className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <span className="avatar avatar--lg">{initials(user.name)}</span>
          <div>
            <h1 className="page-head__title">{user.name}</h1>
            <p className="page-head__sub" style={{ marginTop: 0 }}>{user.email}</p>
          </div>
        </div>

        {counts && (
          <div className="hero__stats" style={{ marginTop: "var(--space-5)" }}>
            <span className="hero__stat"><b>{counts.bookmarkCount}</b> saved</span>
            <span className="hero__stat"><b>{counts.attendingCount}</b> going to</span>
            <span className="hero__stat"><b>{counts.createdCount}</b> published</span>
          </div>
        )}
      </header>

      <form className="form-card form-stack" onSubmit={handleSubmit} noValidate>
        {error && <Alert>{error}</Alert>}

        <div>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-1)" }}>
            <IconSparkle style={{ width: 18, height: 18, display: "inline", verticalAlign: "-3px", marginRight: 6 }} />
            Your interests
          </h2>
          <p className="field__hint" style={{ marginBottom: "var(--space-4)" }}>
            Pick the categories you care about. The &ldquo;For you&rdquo; filter on the home page
            narrows the feed to just these.
          </p>

          <div className="interest-grid">
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                className="chip"
                aria-pressed={interests.includes(category)}
                onClick={() => toggleInterest(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={60}
            required
          />
        </Field>

        <Field label="Home city" htmlFor="city" optional hint="Shown on your profile only.">
          <Input
            id="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Bengaluru"
            maxLength={100}
          />
        </Field>

        <Field label="Bio" htmlFor="bio" optional>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="A line about what you're into."
            rows={3}
            error={bioOver}
          />
          <span className={`char-count${bioOver ? " char-count--over" : ""}`}>
            {form.bio.length} / {MAX_BIO}
          </span>
        </Field>

        <Field label="Theme" htmlFor="theme" hint="Follows your device by default.">
          <Select id="theme" value={preference} onChange={(e) => setPreference(e.target.value)}>
            <option value="system">Match my device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Field>

        <div className="form-actions">
          <Link to="/" className="btn btn--ghost">Back to events</Link>
          <Button type="submit" variant="primary" loading={saving} disabled={bioOver}>
            Save profile
          </Button>
        </div>
      </form>

      <div style={{ marginBottom: "var(--space-8)" }} />
    </div>
  );
}
