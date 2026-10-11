"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Sparkles } from "lucide-react";
import { motivationalQuotes, QUOTE_INTERVAL_MS } from "@/lib/quotes";

type QuoteState = {
  history: number[];
  cursor: number;
  nextAt: number;
  ready: boolean;
};
const initial: QuoteState = {
  history: [0],
  cursor: 0,
  nextAt: 0,
  ready: false,
};
function nextQuote(state: QuoteState, now: number): QuoteState {
  const previous = state.ready ? state.history : [];
  const choices = motivationalQuotes
    .map((_, i) => i)
    .filter((id) => !previous.includes(id));
  const id = choices[Math.floor(Math.random() * choices.length)];
  const history = [...previous, id].slice(-20);
  return {
    history,
    cursor: history.length - 1,
    nextAt: now + QUOTE_INTERVAL_MS,
    ready: true,
  };
}
function restore(value: string | null): QuoteState {
  try {
    const data = JSON.parse(value || "null");
    if (
      !Array.isArray(data?.history) ||
      !data.history.length ||
      !data.history.every(
        (id: unknown) =>
          Number.isInteger(id) &&
          Number(id) >= 0 &&
          Number(id) < motivationalQuotes.length,
      ) ||
      !Number.isFinite(data.nextAt) ||
      !Number.isInteger(data.cursor)
    )
      return nextQuote(initial, Date.now());
    const history = (data.history as number[]).slice(-20);
    const state = {
      history,
      cursor: Math.max(0, Math.min(history.length - 1, data.cursor)),
      nextAt: Math.min(data.nextAt, Date.now() + QUOTE_INTERVAL_MS),
      ready: true,
    };
    return state.nextAt <= Date.now() ? nextQuote(state, Date.now()) : state;
  } catch {
    return nextQuote(initial, Date.now());
  }
}

export default function MotivationalQuote({ userId }: { userId: string }) {
  const [state, setState] = useState<QuoteState>(initial);
  const storageKey = `upseller:quotes:v2:${userId}`;
  useEffect(() => {
    try {
      setState(restore(localStorage.getItem(storageKey)));
    } catch {
      setState(nextQuote(initial, Date.now()));
    }
  }, [storageKey]);
  useEffect(() => {
    if (!state.ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* Rotation and history still work when storage is unavailable. */
    }
  }, [state, storageKey]);
  useEffect(() => {
    if (!state.ready) return;
    const advanceIfDue = () =>
      setState((current) =>
        Date.now() >= current.nextAt ? nextQuote(current, Date.now()) : current,
      );
    const timer = setTimeout(
      advanceIfDue,
      Math.max(0, state.nextAt - Date.now()),
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") advanceIfDue();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", advanceIfDue);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", advanceIfDue);
    };
  }, [state.nextAt, state.ready]);
  const quote = motivationalQuotes[state.history[state.cursor]];
  return (
    <section
      className="sidebar-note quote-widget"
      aria-label="Daily inspiration"
    >
      <div className="quote-heading">
        <Sparkles size={20} />
        <span>FOR YOU</span>
        <div className="quote-controls">
          <button
            type="button"
            aria-label="Previous quote"
            title="Previous quote"
            disabled={state.cursor === 0}
            onClick={() => setState((s) => ({ ...s, cursor: s.cursor - 1 }))}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="quote-position"
            aria-label={`Quote ${state.cursor + 1} of ${state.history.length}`}
          >
            {state.cursor + 1} <span>/ {state.history.length}</span>
          </span>
          <button
            type="button"
            aria-label="Next quote in history"
            title="Next quote in history"
            disabled={state.cursor === state.history.length - 1}
            onClick={() => setState((s) => ({ ...s, cursor: s.cursor + 1 }))}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="quote-refresh"
            aria-label="Get a new quote"
            title="Get a new quote"
            disabled={!state.ready}
            onClick={() => setState((s) => nextQuote(s, Date.now()))}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>
      <div className="quote-message" aria-live="polite" aria-atomic="true">
        <blockquote key={quote}>{quote}</blockquote>
      </div>
    </section>
  );
}
