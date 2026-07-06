import type { DetailAction, Report } from "./types";
import { getSoleFlexNumberColumnIndex } from "./report";

/** Các action cố định trên hàng header (cùng nút sửa tên). */
export const HEADER_DETAIL_ACTIONS: DetailAction[] = [
  "deleteRows",
  "exportExcel",
];

/** Các action theo ngữ cảnh (hàng actions bên dưới header). */
export function availableActions(
  report: Report,
  selectedColumnIndex: number,
  selectedRowIndexes: number[],
): DetailAction[] {
  const list: DetailAction[] = [];

  const soleFlexIndex = getSoleFlexNumberColumnIndex(report);
  const selectedColumn =
    selectedColumnIndex >= 0 ? report.columns[selectedColumnIndex] : null;

  if (selectedColumn?.type === "FlexNumber" || soleFlexIndex != null) {
    list.push("inputBatch");
  }

  if (selectedRowIndexes.length === 0 || !selectedColumn) {
    return list;
  }

  if (selectedColumn.type === "Date") {
    list.push(
      "decreaseDateBelow",
      "decreaseDate",
      "setDate",
      "increaseDate",
      "increaseDateBelow",
    );
  }
  if (selectedColumn.type === "FlexNumber") {
    list.push("removeZero", "updateOriginalValue", "addZero");
  }

  return list;
}

export const ACTION_LABELS: Record<DetailAction, string> = {
  deleteRows: "Xóa dòng",
  exportExcel: "Export Excel",
  increaseDate: "Ngày +1",
  decreaseDate: "Ngày -1",
  increaseDateBelow: "Ngày +1 (xuống cuối)",
  decreaseDateBelow: "Ngày -1 (xuống cuối)",
  setDate: "Đặt ngày",
  addZero: "Thêm 0",
  removeZero: "Bớt 0",
  updateOriginalValue: "Sửa số",
  inputBatch: "Nhập hàng loạt",
};
