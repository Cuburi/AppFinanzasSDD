import type { TemplateInput, TemplateView } from "../../dto/index.js";
import { mapTemplate } from "../../mappers/monthly-cycle-mappers.js";
import type { MonthlyCyclePorts } from "../ports/monthly-cycle-ports.js";

export const TEMPLATE_USE_CASE_NAMES = ["getTemplate", "updateTemplate"] as const;

export type TemplateUseCases = {
  getTemplate(): Promise<TemplateView>;
  updateTemplate(input: TemplateInput): Promise<TemplateView>;
};

export const createTemplateUseCases = (ports: MonthlyCyclePorts): TemplateUseCases => ({
  async getTemplate() {
    const categories = await ports.templates.readCategories();
    return mapTemplate(categories);
  },

  async updateTemplate(input) {
    const categories = await ports.transactionRunner.run(async (txPorts) => {
      await txPorts.pockets.ensureTemplateDefaultPocketsAreActive(input);
      await txPorts.templates.replaceCategories(input);

      return txPorts.templates.readCategories();
    });

    return mapTemplate(categories);
  },
});
