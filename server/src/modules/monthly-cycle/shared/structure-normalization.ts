import { DomainError } from "./service-errors.js";

export const normalizeStructureName = (name: string) => name.trim().toLocaleLowerCase();

export const nextSortOrder = (items: Array<{ sortOrder: number }>) =>
  items.reduce((maxSortOrder, item) => Math.max(maxSortOrder, item.sortOrder), -1) + 1;

export const assertUniqueStructureName = (
  items: Array<{ name: string }>,
  name: string,
  message: string,
) => {
  const normalizedName = normalizeStructureName(name);

  if (items.some((item) => normalizeStructureName(item.name) === normalizedName)) {
    throw new DomainError(409, message);
  }
};
