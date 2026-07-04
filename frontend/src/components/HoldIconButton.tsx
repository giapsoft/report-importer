import type { ReactNode } from "react";
import { useHoldRepeat } from "@/hooks/useHoldRepeat";

interface HoldIconButtonProps {
  label: string;
  className?: string;
  onAction: () => void;
  children: ReactNode;
}

/** Icon button: nhấn giữ sẽ lặp action liên tục. */
export function HoldIconButton({
  label,
  className = "icon-btn",
  onAction,
  children,
}: HoldIconButtonProps) {
  const hold = useHoldRepeat(onAction);

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      {...hold}
    >
      {children}
    </button>
  );
}
