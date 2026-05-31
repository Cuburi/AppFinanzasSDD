import type { ReactNode } from "react";

export type SectionHeaderProps = {
  action?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export function SectionHeader({ action, description, eyebrow, title }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="stack-sm">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p className="section-description">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="section-actions">{action}</div> : null}
    </header>
  );
}
