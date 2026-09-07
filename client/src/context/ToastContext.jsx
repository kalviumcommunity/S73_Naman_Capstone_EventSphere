import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";

const ToastContext = createContext(null);
const DURATION = 4200;

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5.5v5.2M10 14.2v.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 9v5.5M10 5.9v.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  ),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, variant = "info") => {
      if (!message) return null;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((current) => [...current.slice(-2), { id, message, variant }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION));
      return id;
    },
    [dismiss]
  );

  // Clear pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`}>
            <span className="toast__icon">{ICONS[t.variant] || ICONS.info}</span>
            <p className="toast__message">{t.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
