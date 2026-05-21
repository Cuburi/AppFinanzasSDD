import { MonthStatus, MovementType, Prisma } from "../../lib/prisma-client.js";

export const templateInclude = {
  subcategories: {
    orderBy: { sortOrder: "asc" as const },
  },
};

export const monthInclude = {
  categories: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      subcategories: {
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
  movements: {
    orderBy: { occurredAt: "asc" as const },
  },
  incomes: {
    orderBy: { receivedAt: "asc" as const },
  },
};

export type TemplateCategoryRecord = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: Array<{
    id: string;
    name: string;
    plannedAmount: Prisma.Decimal;
    defaultPocketId: string | null;
    active: boolean;
    sortOrder: number;
  }>;
};

export type MonthRecord = {
  id: string;
  year: number;
  month: number;
  status: MonthStatus;
  openedAt: Date;
  closedAt: Date | null;
  incomes?: Array<{
    id: string;
    monthId: string;
    sourceName: string;
    amount: Prisma.Decimal;
    receivedAt: Date;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  categories: Array<{
    id: string;
    name: string;
    sortOrder: number;
    templateCategoryId: string | null;
    subcategories: Array<{
      id: string;
      name: string;
      plannedAmount: Prisma.Decimal;
      defaultPocketId: string | null;
      templateSubcategoryId: string | null;
      sortOrder: number;
    }>;
  }>;
  movements: Array<{
    type: MovementType;
    amount: Prisma.Decimal;
    sourceSubcategoryId: string | null;
    targetSubcategoryId: string | null;
    sourcePocketId: string | null;
    targetPocketId: string | null;
  }>;
};

export type MonthlyIncomeRecord = NonNullable<MonthRecord["incomes"]>[number];

export type MonthlyCycleDb = {
  $transaction<T>(callback: (tx: MonthlyCycleDb) => Promise<T>): Promise<T>;
  templateCategory: {
    findMany(args: { orderBy: { sortOrder: "asc" }; include: typeof templateInclude }): Promise<TemplateCategoryRecord[]>;
    deleteMany(): Promise<unknown>;
    create(args: {
      data: {
        name: string;
        sortOrder: number;
        subcategories: {
          create: Array<{
            name: string;
            plannedAmount: Prisma.Decimal;
            defaultPocketId: string | null;
            sortOrder: number;
          }>;
        };
      };
    }): Promise<unknown>;
  };
  month: {
    findFirst(args: {
      where: { status: MonthStatus };
      select?: { id: true; year: true; month: true };
      orderBy?: { openedAt: "desc" };
      include?: typeof monthInclude;
    }): Promise<MonthRecord | { id: string; year: number; month: number } | null>;
    findUnique(args: unknown): Promise<unknown>;
    create(args: {
      data: {
        year: number;
        month: number;
        status: MonthStatus;
        categories: {
          create: Array<{
            name: string;
            sortOrder: number;
            templateCategoryId: string;
            subcategories: {
              create: Array<{
                name: string;
                plannedAmount: Prisma.Decimal;
                defaultPocketId: string | null;
                templateSubcategoryId: string;
                sortOrder: number;
              }>;
            };
          }>;
        };
      };
      include: typeof monthInclude;
    }): Promise<MonthRecord>;
    update(args: {
      where: { id: string };
      data: { status: MonthStatus; closedAt: Date };
      include: typeof monthInclude;
    }): Promise<MonthRecord>;
  };
  movement: {
    create(args: {
      data: {
        type: MovementType;
        amount: Prisma.Decimal;
        description?: string | null;
        monthId?: string | null;
        sourceSubcategoryId?: string | null;
        targetSubcategoryId?: string | null;
        sourcePocketId?: string | null;
        targetPocketId?: string | null;
        externalSourceLabel?: string | null;
      };
    }): Promise<unknown>;
  };
  monthlyIncome: {
    findUnique(args: { where: { id: string } }): Promise<MonthlyIncomeRecord | null>;
    create(args: {
      data: {
        monthId: string;
        sourceName: string;
        amount: Prisma.Decimal;
        receivedAt: Date;
        notes: string | null;
      };
    }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: {
        sourceName?: string;
        amount?: Prisma.Decimal;
        receivedAt?: Date;
        notes?: string | null;
      };
    }): Promise<unknown>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  savingsPocket: {
    findUnique(args: { where: { id: string }; select: { id: true; active: true } }): Promise<{ id: string; active: boolean } | null>;
  };
};
