import { Prisma } from "../../../lib/prisma-client.js";

export const toDecimal = (value: number) => new Prisma.Decimal(value.toFixed(2));

export const decimalToNumber = (value: Prisma.Decimal) => Number(value.toString());

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
