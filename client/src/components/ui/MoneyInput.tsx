import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";

import { formatMoneyInput, toMoneyInputDigits } from "../../lib/money";

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "max" | "min" | "onChange" | "step" | "type" | "value"> & {
  /** Whole-peso digits without formatting, e.g. "1234567". */
  value: string;
  onValueChange: (digits: string) => void;
};

/** Caret index in `formatted` that sits right after its `digitCount`-th digit. */
const caretAfterDigits = (formatted: string, digitCount: number) => {
  if (digitCount === 0) return formatted.indexOf("$") === 0 ? Math.min(2, formatted.length) : 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index]!)) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return formatted.length;
};

/** Text input that shows COP thousands separators while typing and reports only exact whole-peso digits. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput({ value, onValueChange, ...props }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingDigitsBeforeCaret = useRef<number | null>(null);
  const formatted = formatMoneyInput(value);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBeforeCaret = pendingDigitsBeforeCaret.current;
    pendingDigitsBeforeCaret.current = null;
    if (!input || digitsBeforeCaret === null || document.activeElement !== input) return;
    const caret = caretAfterDigits(input.value, digitsBeforeCaret);
    input.setSelectionRange(caret, caret);
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { selectionStart, value: typed } = event.target;
    const digits = toMoneyInputDigits(typed);
    const typedBeforeCaret = toMoneyInputDigits(typed.slice(0, selectionStart ?? typed.length));
    // Leading zeros are dropped from the value, so they must not count towards the caret either.
    pendingDigitsBeforeCaret.current = Math.min(typedBeforeCaret.length, digits.length);
    onValueChange(digits);
  };

  return <input {...props} inputMode="numeric" onChange={handleChange} ref={inputRef} type="text" value={formatted} />;
});
