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

export type SavingsPocketMovement = {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  direction: "IN" | "OUT";
};

export type SavingsPocket = {
  id: string;
  name: string;
  goalAmount: number | null;
  active: boolean;
  balance: number;
  recentMovements?: SavingsPocketMovement[];
};

export type PocketListFilter = "active" | "inactive" | "all";

export type CreatePocketInput = {
  name: string;
  goalAmount?: number | null;
};

export type UpdatePocketInput = {
  name?: string;
  goalAmount?: number | null;
  active?: boolean;
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

export type ClosurePendingSurplus = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
  defaultPocketId: string | null;
  requiresPocketSelection: boolean;
};

export type ClosurePendingDeficit = {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
};

export type ClosureReview = {
  monthId: string;
  status: "ACTIVE" | "CLOSED";
  pendingSurpluses: ClosurePendingSurplus[];
  pendingDeficits: ClosurePendingDeficit[];
  canClose: boolean;
};

export type ClosureActionInput = {
  monthId: string;
  type: "SURPLUS_TO_POCKET_ON_CLOSE" | "DEFICIT_COVER_FROM_SUBCATEGORY" | "DEFICIT_COVER_FROM_POCKET";
  sourceSubcategoryId?: string;
  targetSubcategoryId?: string;
  sourcePocketId?: string;
  targetPocketId?: string;
  amount?: number;
  description?: string;
};
