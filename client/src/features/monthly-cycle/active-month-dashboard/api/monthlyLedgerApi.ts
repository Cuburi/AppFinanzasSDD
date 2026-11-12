export type MonthlyLedgerApi = { get: (monthId: string) => Promise<unknown> };

const readJson = async (response: Response): Promise<unknown> => {
  if (response.ok) return response.json();
  const body = await response.json().catch(() => null) as { message?: unknown } | null;
  throw new Error(typeof body?.message === "string" ? body.message : `La solicitud falló con el estado ${response.status}.`);
};

export const monthlyLedgerApi: MonthlyLedgerApi = {
  get: async (monthId) => readJson(await fetch(`/api/months/${encodeURIComponent(monthId)}/ledger?includeSystemEvents=true`)),
};
