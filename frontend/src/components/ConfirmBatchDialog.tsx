import { useState } from "react";
import { toThousandSeparatorString } from "@/domain/format";
import { formSubmit } from "@/utils/enterSubmit";
import { Dialog } from "./Dialog";
import { DateStepper } from "./DateStepper";

interface ConfirmBatchDialogProps {
  initialNumbers: number[];
  initialDate: string | null;
  hasDateColumn: boolean;
  /** Khi chỉ chọn đúng 1 dòng: hiện nút chèn dưới dòng đó (index 0-based). */
  insertAfterRowIndex?: number | null;
  onCancel: () => void;
  onConfirm: (
    numbers: number[],
    date: string | null,
    insertAfterRowIndex?: number | null,
  ) => void;
}

export function ConfirmBatchDialog({
  initialNumbers,
  initialDate,
  hasDateColumn,
  insertAfterRowIndex = null,
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

  const parseNumbers = () =>
    numbers
      .map((s) => Number(String(s).replace(/\./g, "")))
      .filter((n) => Number.isFinite(n));

  const submitAppend = () => {
    onConfirm(parseNumbers(), hasDateColumn && date ? date : null, null);
  };

  const submitInsert = () => {
    onConfirm(
      parseNumbers(),
      hasDateColumn && date ? date : null,
      insertAfterRowIndex,
    );
  };

  const showInsert =
    insertAfterRowIndex != null && insertAfterRowIndex >= 0;

  return (
    <Dialog title="Xác nhận danh sách số">
      <form onSubmit={(e) => formSubmit(e, submitAppend)}>
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
                enterKeyHint="done"
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

        <div className="dialog-actions dialog-actions-spread">
          {showInsert && (
            <button
              type="button"
              className="btn"
              onClick={submitInsert}
            >
              Chèn vào {insertAfterRowIndex! + 1}
            </button>
          )}
          <div className="dialog-actions-end">
            <button type="button" className="btn" onClick={onCancel}>
              Hủy
            </button>
            <button type="submit" className="btn primary">
              Xác nhận
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
