import { useState } from "react";
import { toThousandSeparatorString } from "@/domain/format";
import { Dialog } from "./Dialog";
import { DateStepper } from "./DateStepper";

interface ConfirmBatchDialogProps {
  initialNumbers: number[];
  initialDate: string | null;
  hasDateColumn: boolean;
  onCancel: () => void;
  onConfirm: (numbers: number[], date: string | null) => void;
}

export function ConfirmBatchDialog({
  initialNumbers,
  initialDate,
  hasDateColumn,
  onCancel,
  onConfirm,
}: ConfirmBatchDialogProps) {
  const [numbers, setNumbers] = useState<string[]>(
    initialNumbers.map(String),
  );
  const [date, setDate] = useState(initialDate ?? "");

  const updateAt = (index: number, value: string) => {
    setNumbers((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const removeAt = (index: number) => {
    setNumbers((prev) => prev.filter((_, i) => i !== index));
  };

  const addNumber = () => setNumbers((prev) => [...prev, "0"]);

  const submit = () => {
    const parsed = numbers
      .map((s) => Number(String(s).replace(/\./g, "")))
      .filter((n) => Number.isFinite(n));
    onConfirm(parsed, hasDateColumn && date ? date : null);
  };

  return (
    <Dialog title="Xác nhận danh sách số">
      {hasDateColumn && date && (
        <div className="field">
          <label>Ngày</label>
          <DateStepper value={date} onChange={setDate} />
        </div>
      )}

      <div className="batch-numbers">
        {numbers.map((n, i) => (
          <div className="batch-number-row" key={i}>
            <input
              inputMode="numeric"
              value={n}
              onChange={(e) => updateAt(i, e.target.value)}
              aria-label={`Số ${i + 1}: ${toThousandSeparatorString(Number(n) || 0)}`}
            />
            <button
              type="button"
              className="btn danger"
              onClick={() => removeAt(i)}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn" onClick={addNumber}>
        + Thêm số
      </button>

      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Hủy
        </button>
        <button type="button" className="btn primary" onClick={submit}>
          Xác nhận
        </button>
      </div>
    </Dialog>
  );
}
