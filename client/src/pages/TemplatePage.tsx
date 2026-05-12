import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import type { EditableTemplate, EditableTemplateCategory } from "../types";

const emptyCategory = (): EditableTemplateCategory => ({
  name: "",
  subcategories: [{ name: "", plannedAmount: 0, defaultPocketId: null }],
});

const toEditableTemplate = (template: Awaited<ReturnType<typeof api.getTemplate>>): EditableTemplate => ({
  categories:
    template.categories.length > 0
      ? template.categories.map((category) => ({
          name: category.name,
          subcategories: category.subcategories.map((subcategory) => ({
            name: subcategory.name,
            plannedAmount: subcategory.plannedAmount,
            defaultPocketId: subcategory.defaultPocketId,
          })),
        }))
      : [emptyCategory()],
});

export const TemplatePage = () => {
  const [template, setTemplate] = useState<EditableTemplate>({ categories: [emptyCategory()] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const currentTemplate = await api.getTemplate();
        setTemplate(toEditableTemplate(currentTemplate));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la plantilla.");
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
    field: "name" | "plannedAmount",
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
                      [field]: field === "plannedAmount" ? Number(value) : value,
                    }
                  : subcategory,
              ),
            }
          : category,
      ),
    }));
  };

  const addCategory = () => {
    setTemplate((current) => ({
      categories: [...current.categories, emptyCategory()],
    }));
  };

  const removeCategory = (categoryIndex: number) => {
    setTemplate((current) => ({
      categories: current.categories.filter((_, index) => index !== categoryIndex),
    }));
  };

  const addSubcategory = (categoryIndex: number) => {
    setTemplate((current) => ({
      categories: current.categories.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              subcategories: [...category.subcategories, { name: "", plannedAmount: 0, defaultPocketId: null }],
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
      const savedTemplate = await api.updateTemplate(template);
      setTemplate(toEditableTemplate(savedTemplate));
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
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Plantilla presupuestaria</h1>
          <p>Editás la base que se copia al abrir meses futuros. Los meses ya creados NO cambian.</p>
        </div>
        <strong>Total planificado: ${totalPlanned.toFixed(2)}</strong>
      </header>

      <form className="stack-lg" onSubmit={handleSubmit}>
        {template.categories.map((category, categoryIndex) => (
          <article className="card stack-md" key={`category-${categoryIndex}`}>
            <div className="row between align-start">
              <label className="field grow">
                <span>Categoría</span>
                <input
                  value={category.name}
                  onChange={(event) => updateCategoryName(categoryIndex, event.target.value)}
                  placeholder="Ej: Hogar"
                />
              </label>

              <button className="button secondary" type="button" onClick={() => removeCategory(categoryIndex)}>
                Eliminar categoría
              </button>
            </div>

            <div className="stack-sm">
              {category.subcategories.map((subcategory, subcategoryIndex) => (
                <div className="grid-subcategory" key={`subcategory-${categoryIndex}-${subcategoryIndex}`}>
                  <label className="field">
                    <span>Subcategoría</span>
                    <input
                      value={subcategory.name}
                      onChange={(event) => updateSubcategory(categoryIndex, subcategoryIndex, "name", event.target.value)}
                      placeholder="Ej: Supermercado"
                    />
                  </label>

                  <label className="field field-amount">
                    <span>Monto planificado</span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={subcategory.plannedAmount}
                      onChange={(event) => updateSubcategory(categoryIndex, subcategoryIndex, "plannedAmount", event.target.value)}
                    />
                  </label>

                  <button
                    className="button tertiary"
                    type="button"
                    onClick={() => removeSubcategory(categoryIndex, subcategoryIndex)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <button className="button tertiary" type="button" onClick={() => addSubcategory(categoryIndex)}>
              Agregar subcategoría
            </button>
          </article>
        ))}

        <div className="row gap-sm">
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
