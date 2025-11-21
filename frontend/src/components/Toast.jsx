import { useEffect } from 'react';

export default function Toasts({ toasts, removeToast }) {
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t =>
      setTimeout(() => removeToast(t.id), t.duration || 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
