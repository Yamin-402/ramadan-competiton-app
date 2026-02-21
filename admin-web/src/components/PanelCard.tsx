import { PropsWithChildren, ReactNode } from "react";

interface PanelCardProps extends PropsWithChildren {
  title?: string;
  actions?: ReactNode;
}

export function PanelCard({ title, actions, children }: PanelCardProps) {
  return (
    <section className="panel-card">
      {(title || actions) && (
        <header className="panel-card__header">
          {title ? <h3>{title}</h3> : <span />}
          {actions}
        </header>
      )}
      <div className="panel-card__body">{children}</div>
    </section>
  );
}
