import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoneyInput } from "./MoneyInput";

const ControlledMoneyInput = ({ initial = "", onValue }: { initial?: string; onValue?: (value: string) => void }) => {
  const [value, setValue] = useState(initial);
  return (
    <label>
      <span>Monto</span>
      <MoneyInput
        onValueChange={(next) => {
          setValue(next);
          onValue?.(next);
        }}
        value={value}
      />
    </label>
  );
};

describe("MoneyInput", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows COP thousands separators while typing and reports only the exact digits", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledMoneyInput onValue={onValue} />);
    const input = screen.getByLabelText("Monto");

    await user.type(input, "1234567");

    expect(input).toHaveValue("$ 1.234.567");
    expect(onValue).toHaveBeenLastCalledWith("1234567");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("type", "text");
  });

  it("accepts whole pesos only: separators, letters and decimal marks are dropped", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledMoneyInput onValue={onValue} />);
    const input = screen.getByLabelText("Monto");

    await user.type(input, "12a,5.0");

    expect(input).toHaveValue("$ 1.250");
    expect(onValue).toHaveBeenLastCalledWith("1250");
  });

  it("removes insignificant leading zeros and clears to an empty value", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledMoneyInput onValue={onValue} />);
    const input = screen.getByLabelText("Monto");

    await user.type(input, "0124");
    expect(input).toHaveValue("$ 124");
    expect(onValue).toHaveBeenLastCalledWith("124");

    await user.clear(input);
    expect(input).toHaveValue("");
    expect(onValue).toHaveBeenLastCalledWith("");
  });

  it("formats a value set by the screen, such as a prefilled amount", () => {
    render(<ControlledMoneyInput initial="2500000" />);

    expect(screen.getByLabelText("Monto")).toHaveValue("$ 2.500.000");
  });

  it("keeps the caret next to the digit just typed in the middle of the amount", () => {
    render(<ControlledMoneyInput initial="1000" />);
    const input = screen.getByLabelText<HTMLInputElement>("Monto");

    // "$ 1.000" -> user types "5" after the "1": "$ 15.000", caret right after "5".
    fireEvent.change(input, { target: { value: "$ 15.000", selectionStart: 4, selectionEnd: 4 } });

    expect(input).toHaveValue("$ 15.000");
    expect(input.selectionStart).toBe(4);
  });
});
