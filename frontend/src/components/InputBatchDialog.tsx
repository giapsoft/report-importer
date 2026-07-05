import { useMemo, useState } from "react";
import { toThousandSeparatorString } from "@/domain/format";
import { parseBatchNumbers } from "@/domain/stringToNumber";
import { enterToSubmit, formSubmit } from "@/utils/enterSubmit";
import { Dialog } from "./Dialog";

interface InputBatchDialogProps {
  splitter: string;
  onCancel: () => void;
  onApply: (numbers: number[]) => void;
}

export function InputBatchDialog({
  splitter,
  onCancel,
  onApply,
}: InputBatchDialogProps) {
  const [text, setText] = useState("");

  const previewNumbers = useMemo(
    () => (text.trim() ? parseBatchNumbers(text, splitter) : []),
    [text, splitter],
  );

  const previewLabel = previewNumbers
    .map((n) => toThousandSeparatorString(n))
    .join(", ");

  const apply = () => onApply(parseBatchNumbers(text, splitter));

  return (
    <Dialog title="Nhập hàng loạt">
      <form onSubmit={(e) => formSubmit(e, apply)}>
        <p className="hint">
          Phân tách bằng &quot;{splitter}&quot;. Hỗ trợ text lẫn tạp từ giọng nói.
        </p>
        <div className="field">
          <label htmlFor="batch-input">Dữ liệu</label>
          {text.trim() && (
            <output className="batch-preview" htmlFor="batch-input">
              {previewNumbers.length > 0
                ? previewLabel
                : "— chưa phân tích được số nào —"}
            </output>
          )}
          <textarea
            id="batch-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => enterToSubmit(e, apply)}
            placeholder={`ví dụ: 150 nghìn ${splitter} một triệu ${splitter} abc 2000 xyz`}
            enterKeyHint="done"
            autoFocus
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Hủy
          </button>
          <button type="submit" className="btn primary">
            Áp dụng
          </button>
        </div>
      </form>
    </Dialog>
  );
}
