import { useState } from "react";
import { parseBatchNumbers } from "@/domain/stringToNumber";
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

  return (
    <Dialog title="Nhập hàng loạt">
      <p className="hint">
        Phân tách bằng &quot;{splitter}&quot;. Hỗ trợ text lẫn tạp từ giọng nói.
      </p>
      <div className="field">
        <label htmlFor="batch-input">Dữ liệu</label>
        <textarea
          id="batch-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`ví dụ: 150 nghìn ${splitter} một triệu ${splitter} abc 2000 xyz`}
          autoFocus
        />
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Hủy
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => onApply(parseBatchNumbers(text, splitter))}
        >
          Áp dụng
        </button>
      </div>
    </Dialog>
  );
}
