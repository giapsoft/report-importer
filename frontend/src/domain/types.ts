export type ReportColumnType = "Date" | "FlexNumber" | "SummaryColumn";

export interface ReportColumn {
  name: string;
  type: ReportColumnType;
  /** Chỉ dùng cho SummaryColumn: index các cột FlexNumber trong report.columns */
  parts?: number[];
}

export interface CellValueDate {
  kind: "Date";
  value: string; // ISO yyyy-MM-dd
}

export interface CellValueFlexNumber {
  kind: "FlexNumber";
  originalValue: number;
  multiplier: number;
}

export type CellValue = CellValueDate | CellValueFlexNumber;

export interface ReportRow {
  /** Chỉ gồm Date + FlexNumber, không có slot SummaryColumn */
  values: CellValue[];
}

export interface Report {
  id: string;
  name: string;
  columns: ReportColumn[];
  primaryColumnIndex: number;
  rows: ReportRow[];
  updatedAt?: string;
}

export interface ConfirmBatchResult {
  date: string | null;
  numbers: number[];
}

/** Chế độ chọn dòng trên bảng chi tiết. */
export type RowSelectionMode = "single" | "multi" | "range";

export type DetailAction =
  | "toggleShift"
  | "insertRow"
  | "deleteRows"
  | "exportExcel"
  | "increaseDate"
  | "decreaseDate"
  | "setDate"
  | "addZero"
  | "removeZero"
  | "updateOriginalValue"
  | "inputBatch";
