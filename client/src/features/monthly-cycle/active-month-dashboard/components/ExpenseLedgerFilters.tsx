import type { ExpenseHistoryItem } from "../../../../types";
import { Button } from "../../../../components/ui";

export type ExpenseLedgerFilter = {
  from: string;
  to: string;
  categoryId: string;
  subcategoryId: string;
  paymentMethod: string;
};

export const emptyExpenseLedgerFilter: ExpenseLedgerFilter = { from: "", to: "", categoryId: "", subcategoryId: "", paymentMethod: "" };

export function ExpenseLedgerFilters({ expenses, ready, value, onChange }: {
  expenses: ExpenseHistoryItem[];
  ready: boolean;
  value: ExpenseLedgerFilter;
  onChange: (value: ExpenseLedgerFilter) => void;
}) {
  const categories = [...new Map(expenses.flatMap((expense) => expense.category ? [[expense.category.id, expense.category] as const] : [])).values()];
  const subcategories = [...new Map(expenses.flatMap((expense) => expense.category?.id === value.categoryId && expense.subcategory ? [[expense.subcategory.id, expense.subcategory] as const] : [])).values()];

  return <div className="stack-sm">
    <fieldset className="expense-ledger-filters" disabled={!ready}>
      <legend>Filtrar gastos</legend>
      <label className="field"><span>Desde</span><input type="date" value={value.from} onChange={(event) => onChange({ ...value, from: event.target.value })} /></label>
      <label className="field"><span>Hasta</span><input type="date" value={value.to} onChange={(event) => onChange({ ...value, to: event.target.value })} /></label>
      <label className="field"><span>Filtrar por categoría</span><select value={value.categoryId} onChange={(event) => onChange({ ...value, categoryId: event.target.value, subcategoryId: "" })}>
        <option value="">Todas las categorías</option><option value="uncategorized">Sin categoría</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></label>
      <label className="field"><span>Filtrar por subcategoría</span><select disabled={!value.categoryId || value.categoryId === "uncategorized"} value={value.subcategoryId} onChange={(event) => onChange({ ...value, subcategoryId: event.target.value })}>
        <option value="">Todas las subcategorías</option>
        {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
      </select></label>
      <label className="field"><span>Filtrar por medio de pago</span><select value={value.paymentMethod} onChange={(event) => onChange({ ...value, paymentMethod: event.target.value })}>
        <option value="">Todos los medios</option><option value="CASH">Efectivo</option><option value="NON_CASH">No efectivo</option>
      </select></label>
    </fieldset>
    <Button onClick={() => onChange(emptyExpenseLedgerFilter)} type="button" variant="tertiary">Limpiar filtros</Button>
    <p>{ready ? "Al aplicar filtros se muestran solo gastos. Las fechas incluyen ambos días y usan la zona horaria de este dispositivo." : "Los filtros estarán disponibles cuando se cargue el historial de gastos."}</p>
  </div>;
}
