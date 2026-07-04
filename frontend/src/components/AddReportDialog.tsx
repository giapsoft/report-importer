import { useMemo, useState } from "react";
import type { ReportColumn, ReportColumnType } from "@/domain/types";
import { DEFAULT_COLUMNS } from "@/domain/report";
import { Dialog } from "./Dialog";

interface AddReportDialogProps {
  onCancel: () => void;
  onCreate: (
    name: string,
    columns: ReportColumn[],
    primaryColumnIndex: number,
  ) => void;
}

interface DraftColumn {
  name: string;
  type: ReportColumnType;
  parts: number[];
}

function toDraft(cols: ReportColumn[]): DraftColumn[] {
  return cols.map((c) => ({
    name: c.name,
    type: c.type,
    parts: c.parts ? [...c.parts] : [],
  }));
}

export function AddReportDialog({ onCancel, onCreate }: AddReportDialogProps) {
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<DraftColumn[]>(() =>
    toDraft(DEFAULT_COLUMNS),
  );
  const [primaryColumnIndex, setPrimaryColumnIndex] = useState(1);
  const [adding, setAdding] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ReportColumnType>("FlexNumber");
  const [newColParts, setNewColParts] = useState<number[]>([]);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flexIndexes = useMemo(
    () =>
      columns
        .map((c, i) => (c.type === "FlexNumber" ? i : -1))
        .filter((i) => i >= 0),
    [columns],
  );

  const primaryCandidates = useMemo(
    () =>
      columns
        .map((c, i) =>
          c.type === "FlexNumber" || c.type === "SummaryColumn" ? i : -1,
        )
        .filter((i) => i >= 0),
    [columns],
  );

  const addColumn = () => {
    const n = newColName.trim();
    if (!n) {
      setError("Nhập tên cột");
      return;
    }
    if (newColType === "SummaryColumn" && newColParts.length < 2) {
      setError("Cột tổng hợp cần chọn ít nhất 2 cột Số linh hoạt");
      return;
    }
    setColumns((prev) => [
      ...prev,
      {
        name: n,
        type: newColType,
        parts: newColType === "SummaryColumn" ? [...newColParts] : [],
      },
    ]);
    setNewColName("");
    setNewColType("FlexNumber");
    setNewColParts([]);
    setAdding(false);
    setError(null);
  };

  const confirmDelete = () => {
    if (deleteIndex == null) return;
    const idx = deleteIndex;
    const col = columns[idx];

    const toRemove = new Set<number>([idx]);
    if (col.type === "FlexNumber") {
      columns.forEach((c, i) => {
        if (c.type === "SummaryColumn" && c.parts.includes(idx)) {
          toRemove.add(i);
        }
      });
    }

    const oldToNew = new Map<number, number>();
    let ni = 0;
    for (let i = 0; i < columns.length; i++) {
      if (toRemove.has(i)) continue;
      oldToNew.set(i, ni++);
    }

    const next = columns
      .filter((_, i) => !toRemove.has(i))
      .map((c) => {
        if (c.type !== "SummaryColumn") return c;
        return {
          ...c,
          parts: c.parts
            .map((p) => oldToNew.get(p))
            .filter((p): p is number => p != null),
        };
      });

    let primary = oldToNew.get(primaryColumnIndex);
    if (primary == null) {
      primary = next.findIndex(
        (c) => c.type === "FlexNumber" || c.type === "SummaryColumn",
      );
    }

    setColumns(next);
    setPrimaryColumnIndex(primary ?? -1);
    setDeleteIndex(null);
  };

  const cascadeMessage = () => {
    if (deleteIndex == null) return "";
    const col = columns[deleteIndex];
    if (col.type !== "FlexNumber") {
      return `Xóa cột "${col.name}"?`;
    }
    const dependents = columns.filter(
      (c, i) =>
        i !== deleteIndex &&
        c.type === "SummaryColumn" &&
        c.parts.includes(deleteIndex),
    );
    if (dependents.length === 0) return `Xóa cột "${col.name}"?`;
    const names = dependents.map((d) => d.name).join(", ");
    return `Xóa cột "${col.name}" sẽ xóa luôn cột tổng hợp: ${names}. Tiếp tục?`;
  };

  const submit = () => {
    if (!name.trim()) {
      setError("Nhập tên báo cáo");
      return;
    }
    if (primaryColumnIndex < 0 || !columns[primaryColumnIndex]) {
      setError("Chọn cột chính (Số linh hoạt hoặc Tổng hợp)");
      return;
    }
    const primary = columns[primaryColumnIndex];
    if (primary.type !== "FlexNumber" && primary.type !== "SummaryColumn") {
      setError("Cột chính phải là Số linh hoạt hoặc Tổng hợp");
      return;
    }
    for (const c of columns) {
      if (c.type === "SummaryColumn" && c.parts.length < 2) {
        setError(`Cột "${c.name}" cần ít nhất 2 cột thành phần`);
        return;
      }
    }

    const finalColumns: ReportColumn[] = columns.map((c) => ({
      name: c.name,
      type: c.type,
      ...(c.type === "SummaryColumn" ? { parts: c.parts } : {}),
    }));

    onCreate(name.trim(), finalColumns, primaryColumnIndex);
  };

  return (
    <Dialog title="Tạo báo cáo mới">
      <div className="field">
        <label htmlFor="report-name">Tên báo cáo</label>
        <input
          id="report-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Chi tiêu tháng 7"
          autoFocus
        />
      </div>

      <p className="hint">
        Chạm vào cột Số linh hoạt / Tổng hợp để chọn làm cột chính (bắt buộc).
      </p>

      <div className="column-list">
        {columns.map((col, index) => {
          const canPrimary =
            col.type === "FlexNumber" || col.type === "SummaryColumn";
          const isPrimary = primaryColumnIndex === index;
          return (
            <div
              key={`${col.name}-${index}`}
              className={`column-item ${isPrimary ? "primary" : ""}`}
              onClick={() => {
                if (canPrimary) setPrimaryColumnIndex(index);
              }}
              role={canPrimary ? "button" : undefined}
            >
              <div className="info">
                <div className="name">
                  {col.name}{" "}
                  {isPrimary && <span className="chip">Cột chính</span>}
                </div>
                <div className="type">
                  {typeLabel(col.type)}
                  {col.type === "SummaryColumn" && col.parts.length > 0
                    ? ` ← ${col.parts.map((p) => columns[p]?.name ?? p).join(" × ")}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                className="btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteIndex(index);
                }}
              >
                Xóa
              </button>
            </div>
          );
        })}
      </div>

      {!adding ? (
        <button type="button" className="btn" onClick={() => setAdding(true)}>
          + Thêm cột
        </button>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div className="field">
            <label>Tên cột</label>
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Định dạng</label>
            <select
              value={newColType}
              onChange={(e) => {
                setNewColType(e.target.value as ReportColumnType);
                setNewColParts([]);
              }}
            >
              <option value="Date">Ngày</option>
              <option value="FlexNumber">Số linh hoạt</option>
              <option value="SummaryColumn">Tổng hợp (nhân)</option>
            </select>
          </div>
          {newColType === "SummaryColumn" && (
            <div className="field">
              <label>Chọn ít nhất 2 cột Số linh hoạt</label>
              <div className="parts-picker">
                {flexIndexes.map((i) => (
                  <label key={i}>
                    <input
                      type="checkbox"
                      checked={newColParts.includes(i)}
                      onChange={(e) => {
                        setNewColParts((prev) =>
                          e.target.checked
                            ? [...prev, i]
                            : prev.filter((x) => x !== i),
                        );
                      }}
                    />
                    {columns[i].name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Hủy
            </button>
            <button type="button" className="btn primary" onClick={addColumn}>
              Thêm
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-box" style={{ padding: 0 }}>{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Hủy
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={submit}
          disabled={primaryCandidates.length === 0}
        >
          Tạo
        </button>
      </div>

      {deleteIndex != null && (
        <div className="overlay" style={{ zIndex: 60 }}>
          <div className="dialog">
            <h3>Xác nhận xóa cột</h3>
            <p>{cascadeMessage()}</p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setDeleteIndex(null)}
              >
                Không
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={confirmDelete}
              >
                Có
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function typeLabel(type: ReportColumnType): string {
  switch (type) {
    case "Date":
      return "Ngày";
    case "FlexNumber":
      return "Số linh hoạt";
    case "SummaryColumn":
      return "Tổng hợp";
  }
}
