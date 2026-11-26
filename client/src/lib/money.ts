const copFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export const formatCop = (amount: number) => `$${amount < 0 ? "-" : ""}${copFormatter.format(Math.abs(amount))} COP`;

/** Keeps numeric text editable while removing insignificant integer leading zeros. */
export const normalizeAmountInput = (value: string) => {
  const [integerPart, decimalPart] = value.split(".", 2);
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");

  return decimalPart === undefined ? normalizedInteger : `${normalizedInteger || "0"}.${decimalPart}`;
};

export const parseAmountInput = (value: string) => Number(normalizeAmountInput(value));

/** Money inputs hold whole pesos only: keeps the digits and drops insignificant leading zeros. */
export const toMoneyInputDigits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** Displays money input digits as COP with thousands separators, e.g. "1234567" -> "$ 1.234.567". */
export const formatMoneyInput = (digits: string) => {
  const wholePesos = toMoneyInputDigits(digits.split(".", 1)[0] ?? "");
  return wholePesos === "" ? "" : `$ ${wholePesos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

/** Converts a stored amount into a money input value; cents are truncated so a maximum is never exceeded. */
export const toMoneyInputValue = (amount: number | null | undefined) => (amount === null || amount === undefined ? "" : String(Math.trunc(amount)));
