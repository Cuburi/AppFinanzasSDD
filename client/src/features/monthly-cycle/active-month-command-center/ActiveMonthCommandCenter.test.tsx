import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveMonthCommandCenter } from "./ActiveMonthCommandCenter";
import type { CommandCenterViewModel } from "./model";

const activeViewModel: CommandCenterViewModel = {
  lifecycle: "active",
  detail: "healthy",
  metrics: {
    available: { status: "available", value: 375 },
    spent: { status: "available", value: 175 },
    planned: { status: "available", value: 800 },
    remaining: { status: "available", value: 375 },
  },
  action: { kind: "close-month", completionClaim: false, target: "/close-month", explanation: "Review the month before closing it." },
};

afterEach(cleanup);

describe("ActiveMonthCommandCenter", () => {
  it("announces loading and error states, and retries without taking initial focus", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const outsideControl = document.createElement("button");
    outsideControl.textContent = "Existing workflow";
    document.body.append(outsideControl);
    outsideControl.focus();

    const { rerender } = render(
      <ActiveMonthCommandCenter
        viewModel={{ ...activeViewModel, lifecycle: "loading", detail: null, metrics: { available: { status: "unavailable", reason: "loading" }, spent: { status: "unavailable", reason: "loading" }, planned: { status: "unavailable", reason: "loading" }, remaining: { status: "unavailable", reason: "loading" } } }}
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading active month summary");
    expect(outsideControl).toHaveFocus();

    rerender(
      <ActiveMonthCommandCenter
        viewModel={{ ...activeViewModel, lifecycle: "error", detail: null, metrics: { available: { status: "unavailable", reason: "request-failed" }, spent: { status: "unavailable", reason: "request-failed" }, planned: { status: "unavailable", reason: "request-failed" }, remaining: { status: "unavailable", reason: "request-failed" } }, action: { kind: "retry-summary", completionClaim: false, target: null, explanation: "Retry loading the month summary." } }}
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load the active month summary");
    await user.click(screen.getByRole("button", { name: "Retry summary" }));
    expect(retry).toHaveBeenCalledTimes(1);
    outsideControl.remove();
  });

  it("renders unopened, active, closed, and unavailable states with truthful actions", () => {
    const { rerender } = render(
      <ActiveMonthCommandCenter
        viewModel={{ ...activeViewModel, lifecycle: "unopened", detail: null, metrics: { available: { status: "unavailable", reason: "report-unavailable" }, spent: { status: "unavailable", reason: "report-unavailable" }, planned: { status: "unavailable", reason: "report-unavailable" }, remaining: { status: "unavailable", reason: "report-unavailable" } }, action: { kind: "open-month", completionClaim: false, target: "#month-setup", explanation: "Open a month before recording activity." } }}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("No active month is open.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open a month" })).toHaveAttribute("href", "#month-setup");

    rerender(<ActiveMonthCommandCenter viewModel={activeViewModel} onRetry={vi.fn()} />);
    expect(within(screen.getByRole("region", { name: "Available" })).getByText("$375.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review the month before closing it." })).toHaveAttribute("href", "/close-month");

    rerender(<ActiveMonthCommandCenter viewModel={{ ...activeViewModel, lifecycle: "closed" }} onRetry={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Month closed: read-only summary");
    expect(screen.queryByRole("link", { name: "Review the month before closing it." })).not.toBeInTheDocument();

    rerender(<ActiveMonthCommandCenter viewModel={{ ...activeViewModel, detail: "unavailable", metrics: { ...activeViewModel.metrics, spent: { status: "unavailable", reason: "request-failed" }, remaining: { status: "unavailable", reason: "request-failed" } }, action: { kind: "retry-summary", completionClaim: false, target: null, explanation: "Authoritative financial data is unavailable. Retry the summary." } }} onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Authoritative financial data is unavailable");
    expect(screen.getByRole("region", { name: "Spent" })).toHaveTextContent("Unavailable");
  });

  it("allows retrying unavailable authoritative data for a closed read-only month", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();

    render(<ActiveMonthCommandCenter viewModel={{ ...activeViewModel, lifecycle: "closed", detail: "unavailable", metrics: { ...activeViewModel.metrics, spent: { status: "unavailable", reason: "request-failed" }, remaining: { status: "unavailable", reason: "request-failed" } }, action: { kind: "retry-summary", completionClaim: false, target: null, explanation: "Authoritative financial data is unavailable. Retry the summary." } }} onRetry={retry} />);

    expect(screen.getByRole("status")).toHaveTextContent("Month closed: read-only summary");
    expect(screen.getByRole("alert")).toHaveTextContent("Authoritative financial data is unavailable");
    await user.click(screen.getByRole("button", { name: "Retry summary" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("provides quick links to existing workflow targets", () => {
    render(<ActiveMonthCommandCenter viewModel={activeViewModel} onRetry={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Record income" })).toHaveAttribute("href", "#monthly-income-workflow");
    expect(screen.getByRole("link", { name: "Record expense" })).toHaveAttribute("href", "#expense-workflow");
    expect(screen.getByRole("link", { name: "View expense history" })).toHaveAttribute("href", "#expense-history-workflow");
    expect(screen.getByRole("link", { name: "Manage month structure" })).toHaveAttribute("href", "#month-structure-workflow");
  });
});
