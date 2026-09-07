import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../api/client";
import { Button, Field, Input, Alert } from "../components/ui";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || "/";

  // Declarative redirect. The previous version called navigate() during render,
  // which React Router warns about and can drop the pending navigation.
  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const account = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${account.name.split(" ")[0]}.`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not sign you in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth">
      <div className="auth__card">
        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__sub">Sign in to save events, RSVP and tune your feed.</p>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><Alert>{error}</Alert></div>}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              autoFocus
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" loading={loading} block>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="auth__demo">
          Try the demo account — <code>demo@eventsphere.com</code> / <code>demo123456</code>
        </p>

        <p className="auth__switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
