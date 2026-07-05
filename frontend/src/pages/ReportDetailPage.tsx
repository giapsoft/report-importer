import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarPlus,
  CalendarMinus,
  CalendarRange,
  CopyPlus,
  Pencil,
  Trash2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import {
  availableActions,
  ACTION_LABELS,
  HEADER_DETAIL_ACTIONS,
} from "@/domain/actions";
import { getColumnSumDisplay, getRowDisplayString } from "@/domain/report";
import { stringToNumber } from "@/domain/stringToNumber";
import type { DetailAction } from "@/domain/types";

const HOLD_REPEAT_ACTIONS = new Set<DetailAction>([
  "increaseDate",
  "decreaseDate",
  "increaseDateBelow",
  "decreaseDateBelow",
  "addZero",
  "removeZero",
]);
import { ConfirmBatchDialog } from "@/components/ConfirmBatchDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DateStepper } from "@/components/DateStepper";
import { Dialog } from "@/components/Dialog";
import { ExportReportDialog } from "@/components/ExportReportDialog";
import { HoldIconButton } from "@/components/HoldIconButton";
import { InputBatchDialog } from "@/components/InputBatchDialog";
import {
  TableScrollFabButton,
  useTableScrollFab,
} from "@/components/TableScrollFab";
import { reportMeta, useAppStore } from "@/store/useAppStore";
import { todayIso } from "@/domain/format";
import { formSubmit } from "@/utils/enterSubmit";

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const splitter = useAppStore((s) => s.splitter);
  const selectedColumnIndex = useAppStore((s) => s.selectedColumnIndex);
  const selectedRowIndexes = useAppStore((s) => s.selectedRowIndexes);

  const resetDetailSelection = useAppStore((s) => s.resetDetailSelection);
  const toggleSelectedColumnIndex = useAppStore((s) => s.toggleSelectedColumnIndex);
  const selectColumnIndex = useAppStore((s) => s.selectColumnIndex);
  const toggleRowSingle = useAppStore((s) => s.toggleRowSingle);
  const toggleRowRange = useAppStore((s) => s.toggleRowRange);
  const toggleSelectAllRows = useAppStore((s) => s.toggleSelectAllRows);
  const setSplitter = useAppStore((s) => s.setSplitter);
  const renameReport = useAppStore((s) => s.renameReport);
  const insertRow = useAppStore((s) => s.insertRow);
  const deleteSelectedRows = useAppStore((s) => s.deleteSelectedRows);
  const addZero = useAppStore((s) => s.addZero);
  const removeZero = useAppStore((s) => s.removeZero);
  const updateOriginalValue = useAppStore((s) => s.updateOriginalValue);
  const increaseDate = useAppStore((s) => s.increaseDate);
  const decreaseDate = useAppStore((s) => s.decreaseDate);
  const increaseDateBelow = useAppStore((s) => s.increaseDateBelow);
  const decreaseDateBelow = useAppStore((s) => s.decreaseDateBelow);
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

  const {
    wrapRef: tableScrollRef,
    canScroll: tableCanScroll,
    atBottom: tableAtBottom,
    scrollToTop: scrollTableToTop,
    scrollToBottom: scrollTableToBottom,
  } = useTableScrollFab([id, report?.rows.length ?? 0]);

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
      case "increaseDateBelow":
        increaseDateBelow(report.id);
        break;
      case "decreaseDateBelow":
        decreaseDateBelow(report.id);
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
          <button
            type="button"
            className="left header-title-btn"
            aria-label="Sửa báo cáo"
            title="Sửa báo cáo"
            onClick={() => {
              setEditName(report.name);
              setEditSplitter(splitter);
              setEditOpen(true);
            }}
          >
            <h1>{report.name}</h1>
            <div className="meta">{reportMeta(report) || "—"}</div>
          </button>
          <div className="header-actions">
            {HEADER_DETAIL_ACTIONS.map((action) => {
              const disabled =
                action === "deleteRows" && selectedRowIndexes.length === 0;
              return (
                <button
                  key={action}
                  type="button"
                  className={`icon-btn ${action === "deleteRows" ? "danger" : ""}`}
                  aria-label={ACTION_LABELS[action]}
                  title={ACTION_LABELS[action]}
                  disabled={disabled}
                  onClick={() => runAction(action)}
                >
                  <ActionIcon action={action} />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="page-body page-body-fill">
        <div className="table-wrap" ref={tableScrollRef}>
          <table className="report-table">
            <thead>
              <tr>
                <th
                  className={
                    report.rows.length > 0 &&
                    selectedRowIndexes.length === report.rows.length
                      ? "stt-all-selected"
                      : ""
                  }
                  onClick={() => toggleSelectAllRows(report.rows.length)}
                  title="Chọn / bỏ chọn tất cả"
                >
                  STT
                </th>
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
                    Chưa có dòng. Dùng Nhân bản dòng hoặc Nhập hàng loạt.
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
                      <td
                        className="stt-cell"
                        onClick={() => toggleRowRange(rowIndex)}
                        title="Chọn dải dòng"
                      >
                        {rowIndex + 1}
                      </td>
                      {report.columns.map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className={
                            selectedColumnIndex === colIndex ? "col-selected" : ""
                          }
                          onClick={() => {
                            toggleRowSingle(rowIndex, colIndex);
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
        <TableScrollFabButton
          canScroll={tableCanScroll}
          atBottom={tableAtBottom}
          onScrollToTop={scrollTableToTop}
          onScrollToBottom={scrollTableToBottom}
        />
      </main>

      <footer className="page-footer">
        <div className="actions-row">
          <div className="actions-row-left">
            {actions
              .filter(
                (action) => action !== "inputBatch" && action !== "insertRow",
              )
              .map((action) =>
                HOLD_REPEAT_ACTIONS.has(action) ? (
                  <HoldIconButton
                    key={action}
                    label={ACTION_LABELS[action]}
                    onAction={() => runAction(action)}
                  >
                    <ActionIcon action={action} />
                  </HoldIconButton>
                ) : (
                  <button
                    key={action}
                    type="button"
                    className="icon-btn"
                    aria-label={ACTION_LABELS[action]}
                    title={ACTION_LABELS[action]}
                    onClick={() => runAction(action)}
                  >
                    <ActionIcon action={action} />
                  </button>
                ),
              )}
          </div>
          <div className="actions-row-right">
            {actions.includes("insertRow") && (
              <button
                type="button"
                className="icon-btn"
                aria-label={ACTION_LABELS.insertRow}
                title={ACTION_LABELS.insertRow}
                onClick={() => runAction("insertRow")}
              >
                <ActionIcon action="insertRow" />
              </button>
            )}
            {actions.includes("inputBatch") && (
              <button
                type="button"
                className="icon-btn action-batch"
                aria-label={ACTION_LABELS.inputBatch}
                title={ACTION_LABELS.inputBatch}
                onClick={() => runAction("inputBatch")}
              >
                <ActionIcon action="inputBatch" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {editOpen && (
        <Dialog title="Sửa báo cáo">
          <form
            onSubmit={(e) =>
              formSubmit(e, () => {
                if (!editName.trim() || !editSplitter.trim()) return;
                renameReport(report.id, editName.trim());
                setSplitter(editSplitter.trim());
                setEditOpen(false);
              })
            }
          >
            <div className="field">
              <label htmlFor="edit-report-name">Tên báo cáo</label>
              <input
                id="edit-report-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                enterKeyHint="done"
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
                enterKeyHint="done"
              />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn primary">
                Lưu
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {numberOpen && (
        <Dialog title="Cập nhật số gốc">
          <form
            onSubmit={(e) =>
              formSubmit(e, () => {
                const n = stringToNumber(numberValue);
                if (n == null) return;
                updateOriginalValue(report.id, n);
                setNumberOpen(false);
              })
            }
          >
            <p className="hint">Multiplier sẽ được đặt về 1.</p>
            <div className="field">
              <label>Giá trị gốc</label>
              <input
                inputMode="numeric"
                enterKeyHint="done"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setNumberOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn primary">
                Áp dụng
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {dateOpen && (
        <Dialog title="Đặt ngày">
          <form
            onSubmit={(e) =>
              formSubmit(e, () => {
                if (!dateValue) return;
                setDate(report.id, dateValue);
                setDateOpen(false);
              })
            }
          >
            <div className="field">
              <label>Ngày</label>
              <DateStepper value={dateValue} onChange={setDateValue} />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setDateOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn primary">
                Áp dụng
              </button>
            </div>
          </form>
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
          insertAfterRowIndex={
            selectedRowIndexes.length === 1 ? selectedRowIndexes[0] : null
          }
          onCancel={() => setBatchConfirm(null)}
          onConfirm={(numbers, date, insertAfter) => {
            applyBatch(report.id, numbers, date, insertAfter);
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

function ActionIcon({ action }: { action: DetailAction }) {
  const size = 18;
  switch (action) {
    case "insertRow":
      return <CopyPlus size={size} />;
    case "deleteRows":
      return <Trash2 size={size} />;
    case "exportExcel":
      return <FileSpreadsheet size={size} />;
    case "increaseDate":
      return <CalendarPlus size={size} />;
    case "decreaseDate":
      return <CalendarMinus size={size} />;
    case "increaseDateBelow":
      return <span className="cal-ctrl-icon">++</span>;
    case "decreaseDateBelow":
      return <span className="cal-ctrl-icon">−−</span>;
    case "setDate":
      return <CalendarRange size={size} />;
    case "addZero":
      return <span className="zero-ctrl-icon">0+</span>;
    case "removeZero":
      return <span className="zero-ctrl-icon">0−</span>;
    case "updateOriginalValue":
      return <Pencil size={size} />;
    case "inputBatch":
      return <Upload size={size} />;
  }
}
