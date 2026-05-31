import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, Card, KpiCard, SectionHeader, StatusPill } from ".";

describe("visual system primitives", () => {
  it("renders cards as labelled regions with nested content", () => {
    render(
      <Card aria-label="Cash flow overview" tone="success">
        <p>Available cash is positive.</p>
      </Card>,
    );

    const card = screen.getByRole("region", { name: "Cash flow overview" });
    expect(within(card).getByText("Available cash is positive.")).toBeInTheDocument();
  });

  it("preserves native button behavior while exposing variant-backed actions", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button type="button" variant="primary" onClick={handleClick}>
        Create month
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Create month" });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("announces finance state pills with semantic labels", () => {
    render(<StatusPill tone="warning">Budget at risk</StatusPill>);

    expect(screen.getByRole("status", { name: "Warning: Budget at risk" })).toHaveTextContent(
      "Budget at risk",
    );
  });

  it("derives semantic status labels from nested finance state copy", () => {
    render(
      <StatusPill tone="danger">
        <strong>Cash</strong> spending
      </StatusPill>,
    );

    expect(screen.getByRole("status", { name: "Danger: Cash spending" })).toHaveTextContent(
      "Cash spending",
    );
  });

  it("renders section headers with an optional action inside the labelled header", () => {
    render(
      <SectionHeader
        eyebrow="Monthly report"
        title="Current month"
        description="Review planned and actual spending."
        action={<Button variant="secondary">Refresh report</Button>}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Current month" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Monthly report")).toBeInTheDocument();
    expect(screen.getByText("Review planned and actual spending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh report" })).toBeInTheDocument();
  });

  it("renders KPI cards as labelled metric regions with a trend state", () => {
    render(
      <KpiCard
        label="Available money"
        value="$850.00"
        detail="After planned spending"
        trend="positive"
      />,
    );

    const metric = screen.getByRole("region", { name: "Available money" });
    expect(within(metric).getByText("$850.00")).toBeInTheDocument();
    expect(within(metric).getByText("After planned spending")).toBeInTheDocument();
    expect(within(metric).getByText("Positive trend")).toBeInTheDocument();
  });
});
