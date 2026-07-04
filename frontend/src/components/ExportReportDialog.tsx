import { useState } from "react";
import type { Report } from "@/domain/types";
import { exportReportToExcel } from "@/domain/exportExcel";
import { Dialog } from "./Dialog";

interface ExportReportDialogProps {
  report: Report;
  onClose: () => void;
}

function typeLabel(type: Report["columns"][number]["type"]): string {
  switch (type) {
    case "Date":
      return "Ngày";
    case "FlexNumber":
      return "Số linh hoạt";
    case "SummaryColumn":
      return "Tổng hợp";
  }
}

export function ExportReportDialog({ report, onClose }: ExportReportDialogProps) {
  const [selected, setSelected] = useState<number[]>(() =>
    report.columns.map((_, i) => i),
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (index: number) => {
    setSelected((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
  };

  const selectAll = () => setSelected(report.columns.map((_, i) => i));
  const selectNone = () => setSelected([]);

  const submit = async () => {
    if (selected.length === 0) {
      setError("Chọn ít nhất một cột để export");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      await exportReportToExcel(report, selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog title="Export Excel">
      <p className="hint">
        Cột <strong>STT</strong> luôn được thêm tự động. Chọn các cột muốn đưa vào
        file.
      </p>

      <div className="dialog-actions" style={{ justifyContent: "flex-start", marginBottom: 8 }}>
        <button type="button" className="btn" onClick={selectAll}>
          Chọn tất cả
        </button>
        <button type="button" className="btn" onClick={selectNone}>
          Bỏ chọn
        </button>
      </div>

      <div className="column-list">
        <div className="column-item" style={{ opacity: 0.85 }}>
          <input className="checkbox" type="checkbox" checked disabled readOnly />
          <div className="info">
            <div className="name">STT</div>
            <div className="type">Luôn có trong file Excel</div>
          </div>
        </div>

        {report.columns.map((col, index) => (
          <label
            key={`${col.name}-${index}`}
            className="column-item"
            style={{ cursor: "pointer" }}
          >
            <input
              className="checkbox"
              type="checkbox"
              checked={selected.includes(index)}
              onChange={() => toggle(index)}
            />
            <div className="info">
              <div className="name">{col.name}</div>
              <div className="type">{typeLabel(col.type)}</div>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="error-box" style={{ padding: 0 }}>
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose} disabled={exporting}>
          Hủy
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => void submit()}
          disabled={exporting || selected.length === 0}
        >
          {exporting ? "Đang tạo…" : "Export"}
        </button>
      </div>
    </Dialog>
  );
}
