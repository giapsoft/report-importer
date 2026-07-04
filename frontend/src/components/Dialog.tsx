import type { ReactNode } from "react";

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Dialog({ title, children }: DialogProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
