import type {
  ClosureActionInput,
  ClosureReview,
  CreatePocketInput,
  EditableTemplate,
  Month,
  PocketListFilter,
  SavingsPocket,
  Template,
  UpdatePocketInput,
} from "../types";

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}.`;

    try {
      const errorBody = (await response.json()) as { message?: string };
      throw new Error(errorBody.message ?? fallback);
    } catch (error) {
      if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
        throw error;
      }

      throw new Error(fallback);
    }
  }

  return (await response.json()) as T;
};

export const api = {
  async getPockets(filter: PocketListFilter = "active"): Promise<SavingsPocket[]> {
    const activeQuery = filter === "all" ? "all" : String(filter === "active");
    const response = await fetch(`/api/pockets?active=${activeQuery}`);
    const payload = await readJson<{ pockets: SavingsPocket[] }>(response);

    return payload.pockets;
  },
  async getPocket(id: string): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`);
    return readJson<SavingsPocket>(response);
  },
  async createPocket(input: CreatePocketInput): Promise<SavingsPocket> {
    const response = await fetch("/api/pockets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<SavingsPocket>(response);
  },
  async updatePocket(id: string, input: UpdatePocketInput): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<SavingsPocket>(response);
  },
  async deactivatePocket(id: string): Promise<SavingsPocket> {
    const response = await fetch(`/api/pockets/${id}`, {
      method: "DELETE",
    });

    return readJson<SavingsPocket>(response);
  },
  async getTemplate(): Promise<Template> {
    const response = await fetch("/api/template");
    return readJson<Template>(response);
  },
  async updateTemplate(template: EditableTemplate): Promise<Template> {
    const response = await fetch("/api/template", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(template),
    });

    return readJson<Template>(response);
  },
  async openMonth(input: { year: number; month: number }): Promise<Month> {
    const response = await fetch("/api/months/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return readJson<Month>(response);
  },
  async getActiveMonth(): Promise<Month | null> {
    const response = await fetch("/api/months/active");
    const payload = await readJson<{ month: Month | null }>(response);
    return payload.month;
  },
  async recordExpense(input: { monthId: string; sourceSubcategoryId: string; amount: number; description?: string }): Promise<Month> {
    const response = await fetch(`/api/months/${input.monthId}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceSubcategoryId: input.sourceSubcategoryId,
        amount: input.amount,
        description: input.description,
      }),
    });

    return readJson<Month>(response);
  },
  async depositToPocket(input: {
    monthId?: string;
    sourceSubcategoryId?: string;
    targetPocketId: string;
    amount: number;
    description?: string;
    externalSourceLabel?: string;
  }): Promise<Month | null> {
    const response = await fetch("/api/pockets/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const payload = await readJson<{ month: Month | null }>(response);

    return payload.month;
  },
  async getClosureReview(monthId: string): Promise<ClosureReview> {
    const response = await fetch(`/api/months/${monthId}/closure-review`);
    return readJson<ClosureReview>(response);
  },
  async applyClosureAction(input: ClosureActionInput): Promise<ClosureReview> {
    const response = await fetch(`/api/months/${input.monthId}/closure-actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: input.type,
        sourceSubcategoryId: input.sourceSubcategoryId,
        targetSubcategoryId: input.targetSubcategoryId,
        sourcePocketId: input.sourcePocketId,
        targetPocketId: input.targetPocketId,
        amount: input.amount,
        description: input.description,
      }),
    });

    return readJson<ClosureReview>(response);
  },
  async closeMonth(monthId: string): Promise<Month> {
    const response = await fetch(`/api/months/${monthId}/close`, {
      method: "POST",
    });

    return readJson<Month>(response);
  },
};
