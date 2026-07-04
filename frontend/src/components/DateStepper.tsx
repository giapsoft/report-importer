import { useEffect, useRef } from "react";
import { addDaysIso, formatDateDdMmYyyy } from "@/domain/format";

interface DateStepperProps {
  value: string;
  onChange: (iso: string) => void;
}

export function DateStepper({ value, onChange }: DateStepperProps) {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return () => {
      if (holdRef.current) clearInterval(holdRef.current);
    };
  }, []);

  const startHold = (delta: number) => {
    const step = () => {
      const next = addDaysIso(valueRef.current, delta);
      valueRef.current = next;
      onChange(next);
    };
    step();
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = setInterval(step, 120);
  };

  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  return (
    <div className="date-stepper">
      <button
        type="button"
        className="step-btn"
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(-1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        aria-label="Giảm ngày"
      >
        −
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Ngày ${formatDateDdMmYyyy(value)}`}
      />
      <button
        type="button"
        className="step-btn"
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        aria-label="Tăng ngày"
      >
        +
      </button>
    </div>
  );
}
