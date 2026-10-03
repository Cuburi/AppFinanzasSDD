const copFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export const formatCop = (amount: number) => `$${amount < 0 ? "-" : ""}${copFormatter.format(Math.abs(amount))} COP`;

/** Keeps numeric text editable while removing insignificant integer leading zeros. */
export const normalizeAmountInput = (value: string) => {
  const [integerPart, decimalPart] = value.split(".", 2);
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");

  return decimalPart === undefined ? normalizedInteger : `${normalizedInteger || "0"}.${decimalPart}`;
};

export const parseAmountInput = (value: string) => Number(normalizeAmountInput(value));
