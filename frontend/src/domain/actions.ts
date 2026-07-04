import type { DetailAction, Report, RowSelectionMode } from "./types";

export const SELECTION_MODE_ORDER: RowSelectionMode[] = [
  "single",
  "multi",
  "range",
];

export const SELECTION_MODE_LABELS: Record<RowSelectionMode, string> = {
  single: "Chọn một",
  multi: "Chọn nhiều",
  range: "Chọn dải",
};

export function nextSelectionMode(mode: RowSelectionMode): RowSelectionMode {
  const i = SELECTION_MODE_ORDER.indexOf(mode);
  return SELECTION_MODE_ORDER[(i + 1) % SELECTION_MODE_ORDER.length];
}

/** Các action cố định trên hàng header (cùng nút sửa tên). */
export const HEADER_DETAIL_ACTIONS: DetailAction[] = [
  "toggleShift",
  "deleteRows",
  "exportExcel",
];

/** Các action theo ngữ cảnh (hàng actions bên dưới header). */
export function availableActions(
  report: Report,
  selectedColumnIndex: number,
  selectedRowIndexes: number[],
): DetailAction[] {
  const list: DetailAction[] = ["insertRow"];

  const column =
    selectedColumnIndex >= 0 ? report.columns[selectedColumnIndex] : null;

  if (column?.type === "FlexNumber") {
    list.push("inputBatch");
  }

  if (selectedRowIndexes.length === 0 || !column) {
    return list;
  }

  if (column.type === "Date") {
    list.push("increaseDate", "decreaseDate", "setDate");
  }
  if (column.type === "FlexNumber") {
    list.push("addZero", "removeZero", "updateOriginalValue");
  }

  return list;
}

export const ACTION_LABELS: Record<DetailAction, string> = {
  toggleShift: "Chế độ chọn dòng",
  insertRow: "Chèn dòng",
  deleteRows: "Xóa dòng",
  exportExcel: "Export Excel",
  increaseDate: "Ngày +1",
  decreaseDate: "Ngày -1",
  setDate: "Đặt ngày",
  addZero: "Thêm 0",
  removeZero: "Bớt 0",
  updateOriginalValue: "Sửa số",
  inputBatch: "Nhập hàng loạt",
};
