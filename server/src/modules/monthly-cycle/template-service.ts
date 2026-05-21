import type { TemplateInput, TemplateView } from "./dto/index.js";
import { decimal } from "./money.js";
import { readTemplateCategories, assertTemplateDefaultPocketsAreActive } from "./month-queries.js";
import { mapTemplate } from "./monthly-cycle-mappers.js";
import type { MonthlyCycleDb } from "./service-types.js";

export const createTemplateService = (db: MonthlyCycleDb) => ({
  async getTemplate(): Promise<TemplateView> {
    const categories = await readTemplateCategories(db);
    return mapTemplate(categories);
  },

  async updateTemplate(input: TemplateInput): Promise<TemplateView> {
    const categories = await db.$transaction(async (tx) => {
      await assertTemplateDefaultPocketsAreActive(tx, input);
      await tx.templateCategory.deleteMany();

      for (const [categoryIndex, category] of input.categories.entries()) {
        await tx.templateCategory.create({
          data: {
            name: category.name,
            sortOrder: categoryIndex,
            subcategories: {
              create: category.subcategories.map((subcategory, subcategoryIndex) => ({
                name: subcategory.name,
                plannedAmount: decimal(subcategory.plannedAmount),
                defaultPocketId: subcategory.defaultPocketId ?? null,
                sortOrder: subcategoryIndex,
              })),
            },
          },
        });
      }

      return readTemplateCategories(tx);
    });

    return mapTemplate(categories);
  },
});
