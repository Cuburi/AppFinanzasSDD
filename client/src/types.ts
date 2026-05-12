export type TemplateSubcategory = {
  id: string;
  name: string;
  plannedAmount: number;
  defaultPocketId: string | null;
  active: boolean;
  sortOrder: number;
};

export type TemplateCategory = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: TemplateSubcategory[];
};

export type Template = {
  categories: TemplateCategory[];
};

export type EditableTemplateSubcategory = Pick<TemplateSubcategory, "name" | "plannedAmount" | "defaultPocketId">;

export type EditableTemplateCategory = {
  name: string;
  subcategories: EditableTemplateSubcategory[];
};

export type EditableTemplate = {
  categories: EditableTemplateCategory[];
};

export type MonthSubcategory = {
  id: string;
  name: string;
  plannedAmount: number;
  available: number;
  defaultPocketId: string | null;
  templateSubcategoryId: string | null;
  sortOrder: number;
};

export type MonthCategory = {
  id: string;
  name: string;
  sortOrder: number;
  templateCategoryId: string | null;
  subcategories: MonthSubcategory[];
};

export type Month = {
  id: string;
  year: number;
  month: number;
  status: "ACTIVE" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  categories: MonthCategory[];
};
