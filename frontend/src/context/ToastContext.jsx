import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "success") => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast = {
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
    info: (m) => push(m, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, type, onClose }) {
  const config = {
    success: { icon: "check_circle", color: "text-success" },
    error: { icon: "error", color: "text-danger" },
    info: { icon: "info", color: "text-primary" },
  }[type];

  return (
    <div className="flex min-w-[280px] max-w-sm animate-fade-in items-start gap-3 rounded-xl bg-white p-4 shadow-modal ring-1 ring-line">
      <span className={`ms text-[20px] ${config.color}`}>{config.icon}</span>
      <p className="flex-1 text-sm font-medium text-ink">{message}</p>
      <button onClick={onClose} className="text-ink-soft transition hover:text-ink">
        <span className="ms text-[18px]">close</span>
      </button>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
