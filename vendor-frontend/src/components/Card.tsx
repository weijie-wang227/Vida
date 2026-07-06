import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, action, children, className = "" }: CardProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || action) && (
        <div className="panel__header">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
