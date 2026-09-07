import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Button, Field, Input, Textarea, Select, Alert, Switch, Spinner, EmptyState } from "../components/ui";
import { IconTicket, IconPlus, IconCheck } from "../components/ui/Icons";
import { toDateTimeInputValue } from "../lib/format";

const CATEGORIES = ["Music", "Sports", "Tech", "Art", "Food", "Business", "Other"];
const MAX_DESCRIPTION = 5000;

const EMPTY = {
  name: "", date: "", endDate: "", venue: "", city: "", country: "",
  location: "", description: "", category: "Other", url: "", isOnline: false,
};

/** Shared by /create-event and /events/:id/edit. */
export default function EventFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState("");
  const [loadError, setLoadError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return undefined;
    const controller = new AbortController();

    api
      .get(`/api/events/${id}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!data.isOwner) {
          setLoadError("You can only edit events you created.");
          return;
        }
        setForm({
          name: data.name || "",
          date: toDateTimeInputValue(data.date),
          endDate: data.endDate ? toDateTimeInputValue(data.endDate) : "",
          venue: data.venue || "",
          city: data.city || "",
          country: data.country || "",
          location: data.location || "",
          description: data.description || "",
          category: data.category || "Other",
          url: data.url || "",
          isOnline: Boolean(data.isOnline),
        });
        setImage(data.image || "");
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setLoadError(errorMessage(err, "Could not load this event."));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id, isEdit]);

  const setValue = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValue(name, type === "checkbox" ? checked : value);
  };

  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 3) errors.name = "Give the event a name of at least 3 characters.";
    if (!form.date) errors.date = "When does it start?";
    if (form.endDate && form.date && new Date(form.endDate) < new Date(form.date)) {
      errors.endDate = "The end must be on or after the start.";
    }
    // Location is derived from venue/city, so validate what the user actually typed.
    if (!form.isOnline && !form.venue.trim() && !form.city.trim()) {
      errors.city = "Add a venue or a city.";
    }
    if (form.description.length > MAX_DESCRIPTION) {
      errors.description = `Keep it under ${MAX_DESCRIPTION.toLocaleString()} characters.`;
    }
    if (form.url && !/^https?:\/\/.+/i.test(form.url)) {
      errors.url = "Links must start with http:// or https://";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("That image is larger than 2MB.");
      e.target.value = "";
      return;
    }

    const body = new FormData();
    body.append("image", file);
    setUploading(true);

    try {
      const { data } = await api.post("/api/upload", body);
      setImage(data.url);
      toast.success("Cover image uploaded.");
    } catch (err) {
      toast.error(errorMessage(err, "Could not upload that image."));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setSaving(true);

    const location =
      form.isOnline
        ? "Online"
        : [form.venue.trim(), form.city.trim(), form.country.trim()].filter(Boolean).join(", ");

    const payload = {
      name: form.name.trim(),
      date: new Date(form.date).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      location,
      venue: form.venue.trim(),
      city: form.isOnline ? "Online" : form.city.trim(),
      country: form.country.trim(),
      description: form.description.trim(),
      category: form.category,
      url: form.url.trim() || undefined,
      isOnline: form.isOnline,
      image,
      // Pin the event to the organiser's zone. Without this a 7am Bengaluru run
      // would render as 1:30am to a viewer in London.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      const { data } = isEdit
        ? await api.put(`/api/events/${id}`, payload)
        : await api.post("/api/events", payload);

      toast.success(isEdit ? "Event updated." : "Event published.");
      navigate(`/events/${data._id}`);
    } catch (err) {
      setError(errorMessage(err, `Could not ${isEdit ? "update" : "create"} the event.`));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading event…" />;

  if (loadError) {
    return (
      <div className="container section">
        <EmptyState icon={IconTicket} title="Cannot edit this event" action={<Link to="/my-events" className="btn btn--primary">Back to my events</Link>}>
          {loadError}
        </EmptyState>
      </div>
    );
  }

  const descriptionOver = form.description.length > MAX_DESCRIPTION;

  return (
    <div className="container container--narrow">
      <header className="page-head">
        <h1 className="page-head__title">{isEdit ? "Edit event" : "Add an event"}</h1>
        <p className="page-head__sub">
          {isEdit
            ? "Update the details. Changes appear immediately for everyone."
            : "Share something happening in your area. It will show up in search straight away."}
        </p>
      </header>

      <form className="form-card form-stack" onSubmit={handleSubmit} noValidate>
        {error && <Alert>{error}</Alert>}

        <Field label="Event name" htmlFor="name" error={fieldErrors.name}>
          <Input
            id="name" name="name" value={form.name} onChange={handleChange}
            placeholder="e.g. Friday Night Jazz at the Corner Bar"
            error={fieldErrors.name} maxLength={160} required autoFocus={!isEdit}
          />
        </Field>

        <div className="form-row">
          <Field label="Starts" htmlFor="date" error={fieldErrors.date}>
            <Input
              id="date" name="date" type="datetime-local" value={form.date}
              onChange={handleChange} error={fieldErrors.date} required
            />
          </Field>
          <Field label="Ends" htmlFor="endDate" optional error={fieldErrors.endDate}>
            <Input
              id="endDate" name="endDate" type="datetime-local" value={form.endDate}
              min={form.date || undefined} onChange={handleChange} error={fieldErrors.endDate}
            />
          </Field>
        </div>

        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Switch
          checked={form.isOnline}
          onChange={(e) => setValue("isOnline", e.target.checked)}
          label="This is an online event"
        />

        {!form.isOnline && (
          <>
            <Field label="Venue" htmlFor="venue" optional>
              <Input
                id="venue" name="venue" value={form.venue} onChange={handleChange}
                placeholder="e.g. The Corner Bar" maxLength={200}
              />
            </Field>

            <div className="form-row">
              <Field label="City" htmlFor="city" error={fieldErrors.city}>
                <Input
                  id="city" name="city" value={form.city} onChange={handleChange}
                  placeholder="e.g. Bengaluru" error={fieldErrors.city} maxLength={100}
                />
              </Field>
              <Field label="Country" htmlFor="country" optional>
                <Input
                  id="country" name="country" value={form.country} onChange={handleChange}
                  placeholder="e.g. India" maxLength={100}
                />
              </Field>
            </div>
          </>
        )}

        <Field
          label="Description"
          htmlFor="description"
          optional
          error={fieldErrors.description}
          hint="What is it, who is it for, and what should people bring?"
        >
          <Textarea
            id="description" name="description" value={form.description} onChange={handleChange}
            placeholder="Tell people what to expect…" rows={6} error={fieldErrors.description}
          />
          <span className={`char-count${descriptionOver ? " char-count--over" : ""}`}>
            {form.description.length.toLocaleString()} / {MAX_DESCRIPTION.toLocaleString()}
          </span>
        </Field>

        <Field
          label="Ticket or info link"
          htmlFor="url"
          optional
          error={fieldErrors.url}
          hint="Where people can get tickets or read more."
        >
          <Input
            id="url" name="url" type="url" value={form.url} onChange={handleChange}
            placeholder="https://…" error={fieldErrors.url}
          />
        </Field>

        <Field label="Cover image" optional hint="JPG, PNG, WebP, GIF or AVIF. Up to 2MB.">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {image && (
              <img
                src={image}
                alt="Cover preview"
                style={{
                  width: 120, height: 68, objectFit: "cover",
                  borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                }}
              />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleUpload}
              className="visually-hidden"
              id="cover"
            />
            <Button
              type="button"
              variant="secondary"
              icon={image ? IconCheck : IconPlus}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {image ? "Replace image" : "Upload image"}
            </Button>
            {image && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImage("")}>
                Remove
              </Button>
            )}
          </div>
        </Field>

        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEdit ? "Save changes" : "Publish event"}
          </Button>
        </div>
      </form>
    </div>
  );
}
