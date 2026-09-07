import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../api/client";
import { Button, Field, Input, Alert } from "../components/ui";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((current) => ({ ...current, [e.target.name]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
    if (form.password.length < 6) errors.password = "Use at least 6 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      // Registration returns a token, so the user lands signed in rather than
      // being bounced to the login form.
      const account = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success(`Welcome to EventSphere, ${account.name.split(" ")[0]}.`);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth">
      <div className="auth__card">
        <h1 className="auth__title">Create your account</h1>
        <p className="auth__sub">Free, takes a moment. Then pick the categories you care about.</p>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><Alert>{error}</Alert></div>}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <Field label="Name" htmlFor="name" error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              error={fieldErrors.name}
              required
              autoComplete="name"
              autoFocus
            />
          </Field>

          <Field label="Email" htmlFor="email" error={fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={fieldErrors.email}
              required
              autoComplete="email"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={fieldErrors.password}
            hint="At least 6 characters."
          >
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Choose a password"
              value={form.password}
              onChange={handleChange}
              error={fieldErrors.password}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" loading={loading} block>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
