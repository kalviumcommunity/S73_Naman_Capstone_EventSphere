import { useEffect, useId, useRef } from "react";
import { IconClose, IconInbox } from "./Icons";

/* --- Button --------------------------------------------------------------- */

export function Button({
  variant = "secondary",
  size,
  block,
  loading,
  icon: Icon,
  iconAfter: IconAfter,
  children,
  className = "",
  disabled,
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size ? `btn--${size}` : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        Icon && <span className="btn__icon"><Icon /></span>
      )}
      {children}
      {IconAfter && !loading && <span className="btn__icon"><IconAfter /></span>}
    </button>
  );
}

/* --- Fields --------------------------------------------------------------- */

export function Field({ label, hint, error, optional, children, htmlFor }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {optional && <span className="field__optional"> (optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field__error">{error}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}

export function Input({ error, className = "", ...rest }) {
  return (
    <input
      className={`input ${className}`.trim()}
      aria-invalid={error ? "true" : undefined}
      {...rest}
    />
  );
}

export function Textarea({ error, className = "", ...rest }) {
  return (
    <textarea
      className={`textarea ${className}`.trim()}
      aria-invalid={error ? "true" : undefined}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select className={`select ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label, ...rest }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onChange} {...rest} />
      <span className="switch__track"><span className="switch__thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

/* --- Feedback ------------------------------------------------------------- */

export function Alert({ variant = "error", children }) {
  return (
    <div className={`alert alert--${variant}`} role={variant === "error" ? "alert" : undefined}>
      <svg className="alert__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6.2v4.4M10 13.4v.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="loading-block">
      <span className="spinner spinner--page" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = IconInbox, title, children, action }) {
  return (
    <div className="empty">
      <span className="empty__icon"><Icon /></span>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__body">{children}</p>}
      {action}
    </div>
  );
}

/* --- Badge ---------------------------------------------------------------- */

const CATEGORY_VARS = {
  Music: ["--cat-music", "--cat-music-soft"],
  Sports: ["--cat-sports", "--cat-sports-soft"],
  Tech: ["--cat-tech", "--cat-tech-soft"],
  Art: ["--cat-art", "--cat-art-soft"],
  Food: ["--cat-food", "--cat-food-soft"],
  Business: ["--cat-business", "--cat-business-soft"],
  Other: ["--cat-other", "--cat-other-soft"],
};

/** Inline custom properties so one CSS rule serves every category. */
export function categoryStyle(category) {
  const [hue, soft] = CATEGORY_VARS[category] || CATEGORY_VARS.Other;
  return { "--cat-hue": `var(${hue})`, "--cat-soft": `var(${soft})` };
}

export function Badge({ variant = "neutral", category, children, style, ...rest }) {
  const isCategory = variant === "category";
  return (
    <span
      className={`badge badge--${variant}`}
      style={isCategory ? { ...categoryStyle(category), ...style } : style}
      {...rest}
    >
      {children}
    </span>
  );
}

/* --- Skeleton ------------------------------------------------------------- */

export function Skeleton({ width, height = "1em", radius, style }) {
  return (
    <span
      className="skeleton"
      style={{ display: "block", width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/* --- Modal ---------------------------------------------------------------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const confirmRef = useRef(null);

  // Move focus into the dialog, restore it on close, and trap Escape.
  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    confirmRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 className="modal__title" id={titleId}>{title}</h2>
        {body && <p className="modal__body">{body}</p>}
        <div className="modal__actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --- Misc ----------------------------------------------------------------- */

export function IconButton({ icon: Icon, label, className = "", ...rest }) {
  return (
    <button className={`icon-btn ${className}`.trim()} aria-label={label} title={label} {...rest}>
      <Icon />
    </button>
  );
}

export function CloseButton(props) {
  return <IconButton icon={IconClose} label="Close" {...props} />;
}
