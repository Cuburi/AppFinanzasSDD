export type MonthlyCycleMoney = { toString(): string };

export const decimal = (value: number): MonthlyCycleMoney => {
  const normalizedValue = Number(value.toFixed(2)).toString();

  return { toString: () => normalizedValue };
};

export const decimalToNumber = (value: MonthlyCycleMoney) => Number(value.toString());
export const roundMoney = (value: number) => Number(value.toFixed(2));
export const isZero = (value: number) => Math.abs(value) < 0.005;
