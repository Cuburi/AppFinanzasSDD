import type { TemplateInput, TemplateView } from "../dto/index.js";
import { mapTemplate } from "../mappers/monthly-cycle-mappers.js";
import { resolveMonthlyCyclePorts, type MonthlyCycleWorkflowDependencies } from "./workflow-dependencies.js";

export const createTemplateService = (dependencies: MonthlyCycleWorkflowDependencies) => {
  const ports = resolveMonthlyCyclePorts(dependencies);

  return {
    async getTemplate(): Promise<TemplateView> {
      const categories = await ports.templates.readCategories();
      return mapTemplate(categories);
    },

    async updateTemplate(input: TemplateInput): Promise<TemplateView> {
      const categories = await ports.transactionRunner.run(async (txPorts) => {
        await txPorts.pockets.ensureTemplateDefaultPocketsAreActive(input);
        await txPorts.templates.replaceCategories(input);

        return txPorts.templates.readCategories();
      });

      return mapTemplate(categories);
    },
  };
};
