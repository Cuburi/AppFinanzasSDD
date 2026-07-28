import type { FormEventHandler, ReactNode, Ref } from "react";

export type RegistrationSlipProps = {
  actions: ReactNode;
  feedback?: ReactNode;
  formClassName?: string;
  formId?: string;
  mode: "create" | "edit";
  onSubmit: FormEventHandler<HTMLFormElement>;
  primaryFields: ReactNode;
  purpose: string;
  slipRef?: Ref<HTMLElement>;
  supportingFields: ReactNode;
  title: string;
  variant: "primary" | "secondary";
};

/**
 * Shared monthly-cycle anatomy for expense and income capture. It deliberately
 * stays in the feature because its sections express finance workflow priority.
 */
export function RegistrationSlip({ actions, feedback, formClassName, formId, mode, onSubmit, primaryFields, purpose, slipRef, supportingFields, title, variant }: RegistrationSlipProps) {
  return (
    <section aria-label={title} className={`registration-slip registration-slip-${variant} registration-slip-${mode}`} ref={slipRef}>
      <header className="registration-slip-header">
        <p className="eyebrow">{purpose}</p>
        <h2>{title}</h2>
      </header>
      <form className={formClassName} id={formId} onSubmit={onSubmit}>
        <div className="registration-slip-primary-fields">{primaryFields}</div>
        <div className="registration-slip-supporting-fields">{supportingFields}</div>
        <div className="registration-slip-actions">{actions}</div>
      </form>
      {feedback ? <div className="registration-slip-feedback">{feedback}</div> : null}
    </section>
  );
}
