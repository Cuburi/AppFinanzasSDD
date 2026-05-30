import { Prisma } from "../../../lib/prisma-client.js";

export const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
export const decimalToNumber = (value: Prisma.Decimal) => Number(value.toString());
export const roundMoney = (value: number) => Number(value.toFixed(2));
export const isZero = (value: number) => Math.abs(value) < 0.005;
