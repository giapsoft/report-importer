import type { ReactNode } from "react";

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  fullscreen?: boolean;
  headerAction?: ReactNode;
}

export function Dialog({
  title,
  children,
  fullscreen = false,
  headerAction,
}: DialogProps) {
  if (fullscreen) {
    return (
      <div className="overlay overlay-fullscreen" role="dialog" aria-modal="true">
        <div className="dialog dialog-fullscreen">
          <header className="dialog-fullscreen-header">
            <h3>{title}</h3>
            {headerAction && (
              <div className="dialog-fullscreen-header-action">{headerAction}</div>
            )}
          </header>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
