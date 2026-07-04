import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarPlus,
  CalendarMinus,
  CalendarRange,
  BetweenHorizontalStart,
  CheckSquare,
  CircleDot,
  Hash,
  Plus,
  Minus,
  Pencil,
  Rows3,
  Trash2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import {
  availableActions,
  ACTION_LABELS,
  HEADER_DETAIL_ACTIONS,
  SELECTION_MODE_LABELS,
} from "@/domain/actions";
import { getColumnSumDisplay, getRowDisplayString } from "@/domain/report";
import type { DetailAction, RowSelectionMode } from "@/domain/types";
import { ConfirmBatchDialog } from "@/components/ConfirmBatchDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog } from "@/components/Dialog";
import { ExportReportDialog } from "@/components/ExportReportDialog";
import { InputBatchDialog } from "@/components/InputBatchDialog";
import { reportMeta, useAppStore } from "@/store/useAppStore";
import { todayIso } from "@/domain/format";

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const splitter = useAppStore((s) => s.splitter);
  const selectedColumnIndex = useAppStore((s) => s.selectedColumnIndex);
  const selectedRowIndexes = useAppStore((s) => s.selectedRowIndexes);
  const rowSelectionMode = useAppStore((s) => s.rowSelectionMode);

  const resetDetailSelection = useAppStore((s) => s.resetDetailSelection);
  const toggleSelectedColumnIndex = useAppStore((s) => s.toggleSelectedColumnIndex);
  const selectColumnIndex = useAppStore((s) => s.selectColumnIndex);
  const toggleRow = useAppStore((s) => s.toggleRow);
  const toggleShift = useAppStore((s) => s.toggleShift);
  const setSplitter = useAppStore((s) => s.setSplitter);
  const renameReport = useAppStore((s) => s.renameReport);
  const insertRow = useAppStore((s) => s.insertRow);
  const deleteSelectedRows = useAppStore((s) => s.deleteSelectedRows);
  const addZero = useAppStore((s) => s.addZero);
  const removeZero = useAppStore((s) => s.removeZero);
  const updateOriginalValue = useAppStore((s) => s.updateOriginalValue);
  const increaseDate = useAppStore((s) => s.increaseDate);
  const decreaseDate = useAppStore((s) => s.decreaseDate);
  const setDate = useAppStore((s) => s.setDate);
  const applyBatch = useAppStore((s) => s.applyBatch);
  const getMaxSelectedDate = useAppStore((s) => s.getMaxSelectedDate);
  const getBatchDefaultDate = useAppStore((s) => s.getBatchDefaultDate);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSplitter, setEditSplitter] = useState(splitter);
  const [numberOpen, setNumberOpen] = useState(false);
  const [numberValue, setNumberValue] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [dateValue, setDateValue] = useState(todayIso());
  const [deleteRowsOpen, setDeleteRowsOpen] = useState(false);
  const [batchInputOpen, setBatchInputOpen] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState<number[] | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    resetDetailSelection();
    return () => resetDetailSelection();
  }, [id, resetDetailSelection]);

  const actions = useMemo(() => {
    if (!report) return [] as DetailAction[];
    return availableActions(report, selectedColumnIndex, selectedRowIndexes);
  }, [report, selectedColumnIndex, selectedRowIndexes]);

  if (!report) {
    return (
      <div className="app-shell">
        <header className="page-header">
          <div className="header-row">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate("/")}
              aria-label="Quay lại"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="left">
              <h1>Không tìm thấy báo cáo</h1>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const runAction = (action: DetailAction) => {
    switch (action) {
      case "toggleShift":
        toggleShift();
        break;
      case "insertRow":
        insertRow(report.id);
        break;
      case "deleteRows":
        setDeleteRowsOpen(true);
        break;
      case "increaseDate":
        increaseDate(report.id);
        break;
      case "decreaseDate":
        decreaseDate(report.id);
        break;
      case "setDate":
        setDateValue(getMaxSelectedDate(report.id) ?? todayIso());
        setDateOpen(true);
        break;
      case "addZero":
        addZero(report.id);
        break;
      case "removeZero":
        removeZero(report.id);
        break;
      case "updateOriginalValue":
        setNumberValue("");
        setNumberOpen(true);
        break;
      case "inputBatch":
        setBatchInputOpen(true);
        break;
      case "exportExcel":
        setExportOpen(true);
        break;
    }
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <div className="header-row">
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate("/")}
            aria-label="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="left">
            <h1>{report.name}</h1>
            <div className="meta">{reportMeta(report) || "—"}</div>
          </div>
          <div className="header-actions">
            {HEADER_DETAIL_ACTIONS.map((action) => {
              const label =
                action === "toggleShift"
                  ? SELECTION_MODE_LABELS[rowSelectionMode]
                  : ACTION_LABELS[action];
              const modeClass =
                action === "toggleShift" ? `mode-${rowSelectionMode}` : "";
              const disabled =
                action === "deleteRows" && selectedRowIndexes.length === 0;
              return (
                <button
                  key={action}
                  type="button"
                  className={`icon-btn ${modeClass} ${action === "deleteRows" ? "danger" : ""}`}
                  aria-label={label}
                  title={label}
                  disabled={disabled}
                  onClick={() => runAction(action)}
                >
                  <ActionIcon
                    action={action}
                    rowSelectionMode={rowSelectionMode}
                  />
                </button>
              );
            })}
            <button
              type="button"
              className="icon-btn"
              aria-label="Sửa báo cáo"
              title="Sửa báo cáo"
              onClick={() => {
                setEditName(report.name);
                setEditSplitter(splitter);
                setEditOpen(true);
              }}
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="actions-row">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className="icon-btn"
                aria-label={ACTION_LABELS[action]}
                title={ACTION_LABELS[action]}
                onClick={() => runAction(action)}
              >
                <ActionIcon
                  action={action}
                  rowSelectionMode={rowSelectionMode}
                />
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="page-body" style={{ paddingTop: 8 }}>
        <div className="table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>STT</th>
                {report.columns.map((col, index) => {
                  const sumText =
                    col.type === "FlexNumber" || col.type === "SummaryColumn"
                      ? getColumnSumDisplay(report, index)
                      : "";
                  return (
                    <th
                      key={`${col.name}-${index}`}
                      className={[
                        selectedColumnIndex === index ? "col-selected" : "",
                        report.primaryColumnIndex === index ? "col-primary" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleSelectedColumnIndex(index)}
                    >
                      <div className="col-header">
                        <span className="col-header-name">{col.name}</span>
                        {sumText !== "" && (
                          <span className="col-header-sum">{sumText}</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={report.columns.length + 1}
                    style={{ textAlign: "center", color: "var(--muted)" }}
                  >
                    Chưa có dòng. Dùng Chèn dòng hoặc Nhập hàng loạt.
                  </td>
                </tr>
              ) : (
                report.rows.map((row, rowIndex) => {
                  const selected = selectedRowIndexes.includes(rowIndex);
                  return (
                    <tr
                      key={rowIndex}
                      className={selected ? "row-selected" : ""}
                    >
                      <td onClick={() => toggleRow(rowIndex)}>{rowIndex + 1}</td>
                      {report.columns.map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className={
                            selectedColumnIndex === colIndex ? "col-selected" : ""
                          }
                          onClick={() => {
                            toggleRow(rowIndex);
                            selectColumnIndex(colIndex);
                          }}
                        >
                          {getRowDisplayString(report, row, colIndex)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editOpen && (
        <Dialog title="Sửa báo cáo">
          <div className="field">
            <label htmlFor="edit-report-name">Tên báo cáo</label>
            <input
              id="edit-report-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="edit-splitter">Splitter</label>
            <input
              id="edit-splitter"
              value={editSplitter}
              onChange={(e) => setEditSplitter(e.target.value)}
              placeholder="hết"
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={() => setEditOpen(false)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!editName.trim() || !editSplitter.trim()) return;
                renameReport(report.id, editName.trim());
                setSplitter(editSplitter.trim());
                setEditOpen(false);
              }}
            >
              Lưu
            </button>
          </div>
        </Dialog>
      )}

      {numberOpen && (
        <Dialog title="Cập nhật số gốc">
          <p className="hint">Multiplier sẽ được đặt về 1.</p>
          <div className="field">
            <label>Giá trị gốc</label>
            <input
              inputMode="numeric"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={() => setNumberOpen(false)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const n = Number(numberValue.replace(/\./g, ""));
                if (!Number.isFinite(n)) return;
                updateOriginalValue(report.id, Math.trunc(n));
                setNumberOpen(false);
              }}
            >
              Áp dụng
            </button>
          </div>
        </Dialog>
      )}

      {dateOpen && (
        <Dialog title="Đặt ngày">
          <div className="field">
            <label>Ngày</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={() => setDateOpen(false)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!dateValue) return;
                setDate(report.id, dateValue);
                setDateOpen(false);
              }}
            >
              Áp dụng
            </button>
          </div>
        </Dialog>
      )}

      {deleteRowsOpen && (
        <ConfirmDialog
          title="Xóa dòng"
          message={`Xóa ${selectedRowIndexes.length} dòng đã chọn?`}
          danger
          onCancel={() => setDeleteRowsOpen(false)}
          onConfirm={() => {
            deleteSelectedRows(report.id);
            setDeleteRowsOpen(false);
          }}
        />
      )}

      {batchInputOpen && (
        <InputBatchDialog
          splitter={splitter}
          onCancel={() => setBatchInputOpen(false)}
          onApply={(numbers) => {
            setBatchInputOpen(false);
            setBatchConfirm(numbers);
          }}
        />
      )}

      {batchConfirm && (
        <ConfirmBatchDialog
          initialNumbers={batchConfirm}
          initialDate={getBatchDefaultDate(report.id)}
          hasDateColumn={report.columns.some((c) => c.type === "Date")}
          onCancel={() => setBatchConfirm(null)}
          onConfirm={(numbers, date) => {
            applyBatch(report.id, numbers, date);
            setBatchConfirm(null);
          }}
        />
      )}

      {exportOpen && (
        <ExportReportDialog
          report={report}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function ActionIcon({
  action,
  rowSelectionMode,
}: {
  action: DetailAction;
  rowSelectionMode: RowSelectionMode;
}) {
  const size = 18;
  switch (action) {
    case "toggleShift":
      if (rowSelectionMode === "single") return <CircleDot size={size} />;
      if (rowSelectionMode === "multi") return <CheckSquare size={size} />;
      return <BetweenHorizontalStart size={size} />;
    case "insertRow":
      return <Rows3 size={size} />;
    case "deleteRows":
      return <Trash2 size={size} />;
    case "exportExcel":
      return <FileSpreadsheet size={size} />;
    case "increaseDate":
      return <CalendarPlus size={size} />;
    case "decreaseDate":
      return <CalendarMinus size={size} />;
    case "setDate":
      return <CalendarRange size={size} />;
    case "addZero":
      return <Plus size={size} />;
    case "removeZero":
      return <Minus size={size} />;
    case "updateOriginalValue":
      return <Hash size={size} />;
    case "inputBatch":
      return <Upload size={size} />;
  }
}
