import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { formatCop, normalizeAmountInput, parseAmountInput } from "../lib/money";
import type { EditableTemplate, EditableTemplateCategory, SavingsPocket } from "../types";

type TemplateDraftSubcategory = Omit<EditableTemplateCategory["subcategories"][number], "plannedAmount"> & { plannedAmount: string };
type TemplateDraftCategory = Omit<EditableTemplateCategory, "subcategories"> & { subcategories: TemplateDraftSubcategory[] };
type TemplateDraft = { categories: TemplateDraftCategory[] };

const emptyCategory = (): TemplateDraftCategory => ({
  name: "",
  subcategories: [{ name: "", plannedAmount: "0", defaultPocketId: null }],
});

const toTemplateDraft = (template: Awaited<ReturnType<typeof api.getTemplate>>): TemplateDraft => ({
  categories:
    template.categories.length > 0
      ? template.categories.map((category) => ({
          name: category.name,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.name,
            plannedAmount: String(subcategory.plannedAmount),
            defaultPocketId: subcategory.defaultPocketId,
          })),
        }))
      : [emptyCategory()],
});

const toEditableTemplate = (template: TemplateDraft): EditableTemplate => ({
  categories: template.categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({ ...subcategory, plannedAmount: parseAmountInput(subcategory.plannedAmount) })),
  })),
});

export const TemplatePage = () => {
  const [template, setTemplate] = useState<TemplateDraft>({ categories: [emptyCategory()] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePockets, setActivePockets] = useState<SavingsPocket[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({ 0: true });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [currentTemplate, pockets] = await Promise.all([api.getTemplate(), api.getPockets("active")]);
        const nextTemplate = toTemplateDraft(currentTemplate);
        setTemplate(nextTemplate);
        setOpenCategories(Object.fromEntries(nextTemplate.categories.map((_, index) => [index, true])));
        setActivePockets(pockets);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la plantilla y los bolsillos activos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const totalPlanned = useMemo(
    () =>
      template.categories.reduce(
        (total, category) =>
          total + category.subcategories.reduce((subTotal, subcategory) => subTotal + Number(subcategory.plannedAmount || 0), 0),
        0,
      ),
    [template],
  );

  const updateCategoryName = (categoryIndex: number, value: string) => {
    setTemplate((current) => ({
      categories: current.categories.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              name: value,
            }
          : category,
      ),
    }));
  };

  const updateSubcategory = (
    categoryIndex: number,
    subcategoryIndex: number,
    field: "name" | "plannedAmount" | "defaultPocketId",
    value: string,
  ) => {
    setTemplate((current) => ({
      categories: current.categories.map((category, currentCategoryIndex) =>
        currentCategoryIndex === categoryIndex
          ? {
              ...category,
              subcategories: category.subcategories.map((subcategory, currentSubcategoryIndex) =>
                currentSubcategoryIndex === subcategoryIndex
                  ? {
                      ...subcategory,
                      [field]: field === "plannedAmount" ? value : field === "defaultPocketId" ? value || null : value,
                    }
                  : subcategory,
              ),
            }
          : category,
      ),
    }));
  };

  const addCategory = () => {
    setTemplate((current) => {
      setOpenCategories((open) => ({ ...open, [current.categories.length]: true }));
      return { categories: [...current.categories, emptyCategory()] };
    });
  };

  const removeCategory = (categoryIndex: number) => {
    setTemplate((current) => ({
      categories: current.categories.filter((_, index) => index !== categoryIndex),
    }));
    setOpenCategories((open) =>
      Object.fromEntries(Object.values(open).filter((_, index) => index !== categoryIndex).map((value, index) => [index, value])),
    );
  };

  const addSubcategory = (categoryIndex: number) => {
    setTemplate((current) => ({
      categories: current.categories.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              subcategories: [...category.subcategories, { name: "", plannedAmount: "0", defaultPocketId: null }],
            }
          : category,
      ),
    }));
  };

  const removeSubcategory = (categoryIndex: number, subcategoryIndex: number) => {
    setTemplate((current) => ({
      categories: current.categories.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              subcategories: category.subcategories.filter((_, currentSubcategoryIndex) => currentSubcategoryIndex !== subcategoryIndex),
            }
          : category,
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const savedTemplate = await api.updateTemplate(toEditableTemplate(template));
      const nextTemplate = toTemplateDraft(savedTemplate);
      setTemplate(nextTemplate);
      setOpenCategories((open) => Object.fromEntries(nextTemplate.categories.map((_, index) => [index, open[index] ?? true])));
      setMessage("Plantilla guardada. Los próximos meses usarán este snapshot.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Cargando plantilla...</p>;
  }

  return (
    <section className="page template-structure-page">
      <header className="template-structure-header">
        <div>
          <p className="eyebrow">Base de presupuesto</p>
          <h1>Estructura para meses futuros</h1>
          <p>Definí las categorías y montos que se copiarán al abrir cada mes nuevo.</p>
          <p className="template-structure-note">Los meses ya abiertos no cambian.</p>
        </div>
        <section aria-label="Plan total de próximos meses" className="template-total-kpi">
          <span>Plan total</span>
          <strong>{formatCop(totalPlanned)}</strong>
          <small>Distribuido entre tus categorías</small>
        </section>
      </header>

      <form className="stack-lg template-structure-form" onSubmit={handleSubmit}>
        {template.categories.map((category, categoryIndex) => {
          const categoryTotal = category.subcategories.reduce(
            (subtotal, subcategory) => subtotal + Number(subcategory.plannedAmount || 0),
            0,
          );

          return (
            <article aria-label={`Categoría ${category.name || categoryIndex + 1}`} className="card template-category-card" key={`category-${categoryIndex}`}>
              <details
                aria-label={`Subcategorías de ${category.name || categoryIndex + 1}`}
                className="template-category-disclosure"
                open={openCategories[categoryIndex] ?? true}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setOpenCategories((open) => ({ ...open, [categoryIndex]: isOpen }));
                }}
              >
                <summary aria-label={`Alternar subcategorías de ${category.name || categoryIndex + 1}`}>
                  <span>
                    <strong>{category.name || `Categoría ${categoryIndex + 1}`}</strong>
                    <small>{category.subcategories.length} subcategoría{category.subcategories.length === 1 ? "" : "s"}</small>
                  </span>
                  <span className="template-category-summary">
                    <span>Subtotal de {category.name || "la categoría"}</span>
                    <strong>{formatCop(categoryTotal)}</strong>
                  </span>
                </summary>

                <div className="template-category-content">
                  <header className="template-category-header">
                    <label className="field grow">
                      <span>Categoría</span>
                      <input
                        value={category.name}
                        onChange={(event) => updateCategoryName(categoryIndex, event.target.value)}
                        placeholder="Ej: Hogar"
                      />
                    </label>

                    <button className="button tertiary" type="button" onClick={() => removeCategory(categoryIndex)}>
                      Eliminar categoría
                    </button>
                  </header>

                  <div className="template-subcategory-list">
                    <div aria-hidden="true" className="template-subcategory-columns">
                      <span>Subcategoría</span>
                      <span>Monto planificado</span>
                      <span>Bolsillo por defecto</span>
                    </div>
                    {category.subcategories.map((subcategory, subcategoryIndex) => (
                      <div className="template-subcategory-row" key={`subcategory-${categoryIndex}-${subcategoryIndex}`}>
                        <label className="field">
                          <span className="sr-only">Subcategoría</span>
                          <input
                            aria-label={`Subcategoría ${subcategory.name || subcategoryIndex + 1}`}
                            value={subcategory.name}
                            onChange={(event) => updateSubcategory(categoryIndex, subcategoryIndex, "name", event.target.value)}
                            placeholder="Ej: Supermercado"
                          />
                        </label>

                        <label className="field field-amount">
                          <span className="sr-only">Monto planificado</span>
                          <input
                            aria-label={`Monto planificado de ${subcategory.name || subcategoryIndex + 1}`}
                            min="0"
                            step="0.01"
                            type="number"
                            value={subcategory.plannedAmount}
                            onChange={(event) => updateSubcategory(categoryIndex, subcategoryIndex, "plannedAmount", normalizeAmountInput(event.target.value))}
                          />
                        </label>

                        <label className="field">
                          <span className="sr-only">Bolsillo por defecto (opcional)</span>
                          <select
                            aria-label="Bolsillo por defecto (opcional)"
                            value={subcategory.defaultPocketId ?? ""}
                            onChange={(event) => updateSubcategory(categoryIndex, subcategoryIndex, "defaultPocketId", event.target.value)}
                          >
                            <option value="">Sin bolsillo por defecto</option>
                            {activePockets.map((pocket) => (
                              <option key={pocket.id} value={pocket.id}>
                                {pocket.name} ({formatCop(pocket.balance)})
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          aria-label={`Quitar subcategoría ${subcategory.name || subcategoryIndex + 1}`}
                          className="button tertiary template-remove-subcategory"
                          type="button"
                          onClick={() => removeSubcategory(categoryIndex, subcategoryIndex)}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>

                  <button className="button tertiary template-add-subcategory" type="button" onClick={() => addSubcategory(categoryIndex)}>
                    Agregar subcategoría
                  </button>
                </div>
              </details>
            </article>
          );
        })}

        <div className="row gap-sm template-structure-actions">
          <button className="button secondary" type="button" onClick={addCategory}>
            Agregar categoría
          </button>
          <button className="button primary" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Guardar plantilla"}
          </button>
        </div>

        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </form>
    </section>
  );
};
