import { useEffect, useMemo, useRef, useState } from "react";
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
  Volume2,
  Square,
} from "lucide-react";
import {
  availableActions,
  ACTION_LABELS,
  HEADER_DETAIL_ACTIONS,
} from "@/domain/actions";
import { getColumnSumDisplay, getRowDisplayString, getSoleFlexNumberColumnIndex, isNumericColumn } from "@/domain/report";
import {
  playNumberListAudio,
  unlockNumberAudio,
} from "@/domain/numberAudio";
import { stringToNumber } from "@/domain/stringToNumber";
import type { DetailAction } from "@/domain/types";
import { seasonRouteId } from "@/domain/season";

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
  const backToSeasonList = () =>
    navigate(`/seasons/${seasonRouteId(report?.seasonId)}`);
  const splitter = useAppStore((s) => s.splitter);
  const selectedColumnIndex = useAppStore((s) => s.selectedColumnIndex);
  const selectedRowIndexes = useAppStore((s) => s.selectedRowIndexes);
  const startShiftRowIndex = useAppStore((s) => s.startShiftRowIndex);

  const resetDetailSelection = useAppStore((s) => s.resetDetailSelection);
  const toggleSelectedColumnIndex = useAppStore((s) => s.toggleSelectedColumnIndex);
  const selectColumnIndex = useAppStore((s) => s.selectColumnIndex);
  const toggleRowSingle = useAppStore((s) => s.toggleRowSingle);
  const toggleRowRange = useAppStore((s) => s.toggleRowRange);
  const toggleSelectAllRows = useAppStore((s) => s.toggleSelectAllRows);
  const selectSingleRow = useAppStore((s) => s.selectSingleRow);
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
  const [speakingRows, setSpeakingRows] = useState(false);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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

  const soleFlexColumnIndex = useMemo(
    () => (report ? getSoleFlexNumberColumnIndex(report) : null),
    [report],
  );

  useEffect(() => {
    if (soleFlexColumnIndex == null) return;
    selectColumnIndex(soleFlexColumnIndex);
  }, [id, soleFlexColumnIndex, selectColumnIndex]);

  useEffect(() => {
    return () => {
      stopSpeechRef.current?.();
      stopSpeechRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!speakingRows || selectedRowIndexes.length !== 1) return;
    rowRefs.current[selectedRowIndexes[0]]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedRowIndexes, speakingRows]);

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
              onClick={backToSeasonList}
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

  const selectedNumericColumn =
    (selectedColumnIndex >= 0 &&
      isNumericColumn(report.columns[selectedColumnIndex])) ||
    soleFlexColumnIndex != null;

  const showListenRows =
    selectedNumericColumn && report.rows.length > 0;

  const getSttCellClass = (rowIndex: number): string => {
    const classes = ["stt-cell"];
    if (startShiftRowIndex < 0 || !selectedRowIndexes.includes(rowIndex)) {
      return classes.join(" ");
    }

    const rangeStart = startShiftRowIndex;
    if (selectedRowIndexes.length === 1) {
      if (rowIndex === rangeStart) classes.push("stt-range-start");
      return classes.join(" ");
    }

    const rangeEnd = selectedRowIndexes.reduce((far, i) =>
      Math.abs(i - rangeStart) > Math.abs(far - rangeStart) ? i : far,
    );
    if (rowIndex === rangeStart) classes.push("stt-range-start");
    if (rowIndex === rangeEnd && rangeEnd !== rangeStart) {
      classes.push("stt-range-end");
    }
    return classes.join(" ");
  };

  const finishListeningRows = () => {
    setSpeakingRows(false);
    stopSpeechRef.current = null;
  };

  const stopListenRows = () => {
    stopSpeechRef.current?.();
  };

  const listenColumnIndex =
    selectedColumnIndex >= 0 ? selectedColumnIndex : soleFlexColumnIndex ?? -1;

  const startListenRows = () => {
    if (!showListenRows || listenColumnIndex < 0) return;

    const startRow =
      selectedRowIndexes.length > 0
        ? Math.min(...selectedRowIndexes)
        : 0;
    const listenableEntries = report.rows
      .slice(startRow)
      .map((row, offset) => ({
        rowIndex: startRow + offset,
        value: getRowDisplayString(report, row, listenColumnIndex)
          .replace(/\./g, "")
          .trim(),
      }))
      .filter((entry) => entry.value.length > 0);

    if (listenableEntries.length === 0) return;

    const values = listenableEntries.map((entry) => entry.value);
    let startAtIndex = 0;
    if (selectedRowIndexes.length > 0) {
      const anchorRow = Math.min(...selectedRowIndexes);
      const fromSelected = listenableEntries.findIndex(
        (entry) => entry.rowIndex === anchorRow,
      );
      if (fromSelected >= 0) startAtIndex = fromSelected;
    }

    unlockNumberAudio();
    stopSpeechRef.current?.();
    const { stop } = playNumberListAudio(values, {
      startAtIndex,
      onStart: () => setSpeakingRows(true),
      onItemStart: (valueIndex) => {
        selectSingleRow(listenableEntries[valueIndex].rowIndex);
      },
      onEnd: finishListeningRows,
      onError: () => finishListeningRows,
    });
    stopSpeechRef.current = stop;
  };

  return (
    <div className="app-shell">
      <header className={`page-header${speakingRows ? " speaking" : ""}`}>
        <div className="header-row">
          {speakingRows ? (
            <button
              type="button"
              className="header-listen-stop"
              onClick={stopListenRows}
              title="Dừng đọc"
              aria-label="Dừng đọc"
            >
              <Square size={18} />
              <span>Dừng</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={backToSeasonList}
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
                {HEADER_DETAIL_ACTIONS.flatMap((action) => {
                  const disabled =
                    action === "deleteRows" && selectedRowIndexes.length === 0;
                  const buttons = [
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
                    </button>,
                  ];
                  if (action === "deleteRows" && showListenRows) {
                    buttons.push(
                      <button
                        key="listen-rows"
                        type="button"
                        className="icon-btn"
                        aria-label="Đọc số từ hàng đã chọn xuống dưới"
                        title="Đọc số từ hàng đã chọn xuống dưới"
                        onClick={startListenRows}
                      >
                        <Volume2 size={18} />
                      </button>,
                    );
                  }
                  return buttons;
                })}
              </div>
            </>
          )}
        </div>
      </header>

      <main className="page-body page-body-fill">
        <div className="table-scroll-area">
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
                      onClick={() => {
                        if (
                          soleFlexColumnIndex != null &&
                          index === soleFlexColumnIndex &&
                          selectedColumnIndex === index
                        ) {
                          return;
                        }
                        toggleSelectedColumnIndex(index);
                      }}
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
                      ref={(el) => {
                        rowRefs.current[rowIndex] = el;
                      }}
                      className={[
                        selected ? "row-selected" : "",
                        speakingRows && selected ? "row-speaking" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td
                        className={getSttCellClass(rowIndex)}
                        onClick={() => toggleRowRange(rowIndex)}
                        title="Chọn dải dòng"
                      >
                        <span className="stt-cell-value">{rowIndex + 1}</span>
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
          {tableCanScroll && (
            <div className="table-scroll-spacer" aria-hidden="true" />
          )}
        </div>
        <TableScrollFabButton
          canScroll={tableCanScroll}
          atBottom={tableAtBottom}
          onScrollToTop={scrollTableToTop}
          onScrollToBottom={scrollTableToBottom}
        />
        </div>
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
