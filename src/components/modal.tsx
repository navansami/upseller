"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  variant = "modal",
  eyebrow = "THE LITTLE EXTRAS",
  dismissible = true,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  variant?: "modal" | "drawer";
  eyebrow?: string;
  dismissible?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  function close() {
    if (!dismissible || closing) return;
    if (
      variant !== "drawer" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(onClose, 220);
  }
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focusing an off-screen drawer must not scroll its overlay during entry.
    ref.current
      ?.querySelector<HTMLElement>("input, button")
      ?.focus({ preventScroll: true });
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus({ preventScroll: true });
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <div
      className={`modal-backdrop ${variant === "drawer" ? "drawer-backdrop" : ""} ${closing ? "is-closing" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={ref}
        className={`modal ${variant === "drawer" ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            disabled={!dismissible || closing}
            aria-label="Close dialog"
          >
            <X size={21} />
          </button>
        </div>
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}
