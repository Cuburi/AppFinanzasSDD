import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackBanner } from ".";

describe("FeedbackBanner", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders success as a status with icon, title, text and close button", () => {
    render(<FeedbackBanner tone="success">Gasto guardado.</FeedbackBanner>);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Gasto guardado.");
    expect(banner).toHaveClass("feedback-banner", "success");
    expect(banner.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(banner.querySelector(".feedback-banner-title")?.textContent).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar mensaje" })).toBeInTheDocument();
  });

  it("renders error as an alert that never auto-dismisses", () => {
    render(<FeedbackBanner tone="error" title="No se pudo guardar">Falló.</FeedbackBanner>);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar");
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("Falló.");
  });

  it("omits the live role when live is false", () => {
    render(<FeedbackBanner live={false} tone="error">Solo lectura.</FeedbackBanner>);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Solo lectura.")).toBeInTheDocument();
  });

  it("auto-dismisses success after 6 seconds", () => {
    render(<FeedbackBanner tone="success">Listo.</FeedbackBanner>);

    act(() => { vi.advanceTimersByTime(5_900); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("pauses dismissal while hovered and resumes with the remaining time", () => {
    render(<FeedbackBanner tone="success">Listo.</FeedbackBanner>);
    const banner = screen.getByRole("status");

    act(() => { vi.advanceTimersByTime(4_000); });
    fireEvent.mouseEnter(banner);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.mouseLeave(banner);
    act(() => { vi.advanceTimersByTime(1_900); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("pauses dismissal while focus is inside", () => {
    render(<FeedbackBanner tone="success">Listo.</FeedbackBanner>);
    const banner = screen.getByRole("status");

    fireEvent.focus(banner);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.blur(banner);
    act(() => { vi.advanceTimersByTime(6_100); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("closes on demand and shows again for a new message", () => {
    const { rerender } = render(<FeedbackBanner tone="error">Primero.</FeedbackBanner>);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar mensaje" }));
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<FeedbackBanner tone="error">Primero.</FeedbackBanner>);
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<FeedbackBanner tone="error">Segundo.</FeedbackBanner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Segundo.");
  });

  it("restarts the timer for a new success message", () => {
    const { rerender } = render(<FeedbackBanner tone="success">Uno.</FeedbackBanner>);
    act(() => { vi.advanceTimersByTime(5_000); });
    rerender(<FeedbackBanner tone="success">Dos.</FeedbackBanner>);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByRole("status")).toHaveTextContent("Dos.");
  });

  it("closes from the keyboard", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<FeedbackBanner tone="error">Falló.</FeedbackBanner>);

    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar mensaje" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
