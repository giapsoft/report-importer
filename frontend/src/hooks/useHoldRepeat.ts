import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** Nhấn giữ: chạy action ngay, rồi lặp đến khi nhả. */
export function useHoldRepeat(action: () => void, intervalMs = 120) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (holdRef.current) clearInterval(holdRef.current);
    };
  }, []);

  const stop = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  const start = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    actionRef.current();
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = setInterval(() => actionRef.current(), intervalMs);
  };

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}
