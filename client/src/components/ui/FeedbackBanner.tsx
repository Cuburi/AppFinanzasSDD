import { useEffect, useRef, useState } from "react";

import { cx } from "./utils";

const SUCCESS_TIMEOUT_MS = 6000;

export type FeedbackBannerProps = {
  children: string;
  className?: string;
  /** Sets role="status" / role="alert" by tone. Pass false for static notices that were never live regions. */
  live?: boolean;
  title?: string;
  tone: "success" | "error";
};

const defaultTitles = { success: "Listo", error: "No se pudo completar" } as const;

function Icon({ tone }: { tone: FeedbackBannerProps["tone"] }) {
  return (
    <svg aria-hidden="true" className="feedback-banner-icon" focusable="false" viewBox="0 0 24 24">
      {tone === "success" ? (
        <>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12.5l3 3 5-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M12 3.5l9.5 16.5h-19z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
          <path d="M12 10v4.5M12 17.4v.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function FeedbackBanner({ children, className, live = true, title, tone }: FeedbackBannerProps) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(SUCCESS_TIMEOUT_MS);
  const dismissed = dismissedMessage === children;

  // A new message gets a fresh countdown.
  useEffect(() => {
    remaining.current = SUCCESS_TIMEOUT_MS;
  }, [children, tone]);

  useEffect(() => {
    if (tone !== "success" || paused || dismissed) return undefined;

    const startedAt = Date.now();
    const timer = setTimeout(() => setDismissedMessage(children), remaining.current);

    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [children, dismissed, paused, tone]);

  if (dismissed) return null;

  return (
    <div
      className={cx("feedback-banner", tone, className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
    >
      <Icon tone={tone} />
      <div className="feedback-banner-body">
        <p className="feedback-banner-title">{title ?? defaultTitles[tone]}</p>
        <p className="feedback-banner-text">{children}</p>
      </div>
      <button aria-label="Cerrar mensaje" className="feedback-banner-close" onClick={() => setDismissedMessage(children)} type="button">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
