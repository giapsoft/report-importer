import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const BOTTOM_THRESHOLD_PX = 24;

/** Theo dõi vùng cuộn bảng; trả ref gắn vào `.table-wrap`. */
export function useTableScrollFab(deps: unknown[] = []) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight > el.clientHeight + 1;
    setCanScroll(scrollable);
    if (!scrollable) {
      setAtBottom(false);
      return;
    }
    setAtBottom(
      el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD_PX,
    );
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, ...deps]);

  const scrollToTop = () => {
    wrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return { wrapRef, canScroll, atBottom, scrollToTop, scrollToBottom };
}

interface TableScrollFabButtonProps {
  canScroll: boolean;
  atBottom: boolean;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

/** Nút lơ lửng: giữa/trên → xuống cuối; ở cuối → lên đầu. */
export function TableScrollFabButton({
  canScroll,
  atBottom,
  onScrollToTop,
  onScrollToBottom,
}: TableScrollFabButtonProps) {
  if (!canScroll) return null;

  const goTop = atBottom;

  return (
    <button
      type="button"
      className="scroll-jump-btn"
      aria-label={goTop ? "Lăn lên đầu" : "Lăn xuống cuối"}
      title={goTop ? "Lăn lên đầu" : "Lăn xuống cuối"}
      onClick={goTop ? onScrollToTop : onScrollToBottom}
    >
      {goTop ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
      <span>{goTop ? "Lên đầu" : "Xuống cuối"}</span>
    </button>
  );
}
