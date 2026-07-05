import type {
  CellValue,
  CellValueDate,
  CellValueFlexNumber,
  Report,
  ReportColumn,
  ReportRow,
} from "./types";
import {
  addDaysIso,
  formatDateDdMmYyyy,
  maxIsoDate,
  toThousandSeparatorString,
  todayIso,
} from "./format";

export function isValueColumn(col: ReportColumn): boolean {
  return col.type === "Date" || col.type === "FlexNumber";
}

export function isNumericColumn(col: ReportColumn | null | undefined): boolean {
  return col?.type === "FlexNumber" || col?.type === "SummaryColumn";
}

/** Map index cột (trong report.columns) → index trong row.values */
export function columnIndexToValueIndex(
  columns: ReportColumn[],
  columnIndex: number,
): number {
  let vi = 0;
  for (let i = 0; i < columnIndex; i++) {
    if (isValueColumn(columns[i])) vi++;
  }
  return vi;
}

export function valueIndexToColumnIndex(
  columns: ReportColumn[],
  valueIndex: number,
): number {
  let vi = 0;
  for (let i = 0; i < columns.length; i++) {
    if (!isValueColumn(columns[i])) continue;
    if (vi === valueIndex) return i;
    vi++;
  }
  return -1;
}

export function flexValue(cell: CellValueFlexNumber): number {
  return cell.originalValue * cell.multiplier;
}

export function displayCell(cell: CellValue): string {
  if (cell.kind === "Date") return formatDateDdMmYyyy(cell.value);
  return toThousandSeparatorString(flexValue(cell));
}

export function getSummaryValue(report: Report, row: ReportRow, columnIndex: number): number {
  const col = report.columns[columnIndex];
  if (!col || col.type !== "SummaryColumn") return 0;
  const parts = col.parts ?? [];
  if (parts.length === 0) return 0;

  let product = 1;
  for (const p of parts) {
    const vi = columnIndexToValueIndex(report.columns, p);
    const cell = row.values[vi];
    if (!cell || cell.kind !== "FlexNumber") return 0;
    product *= flexValue(cell);
  }
  return product;
}

export function getRowDisplayString(
  report: Report,
  row: ReportRow,
  columnIndex: number,
): string {
  const col = report.columns[columnIndex];
  if (!col) return "";
  if (col.type === "SummaryColumn") {
    return toThousandSeparatorString(getSummaryValue(report, row, columnIndex));
  }
  const vi = columnIndexToValueIndex(report.columns, columnIndex);
  const cell = row.values[vi];
  if (!cell) return "";
  return displayCell(cell);
}

/** Tổng giá trị cột FlexNumber / SummaryColumn (format hàng nghìn). Date → "". */
export function getColumnSumDisplay(report: Report, columnIndex: number): string {
  const col = report.columns[columnIndex];
  if (!col) return "";

  if (col.type === "FlexNumber") {
    const vi = columnIndexToValueIndex(report.columns, columnIndex);
    const sum = report.rows.reduce((acc, row) => {
      const cell = row.values[vi];
      if (cell?.kind === "FlexNumber") return acc + flexValue(cell);
      return acc;
    }, 0);
    return toThousandSeparatorString(sum);
  }

  if (col.type === "SummaryColumn") {
    const sum = report.rows.reduce(
      (acc, row) => acc + getSummaryValue(report, row, columnIndex),
      0,
    );
    return toThousandSeparatorString(sum);
  }

  return "";
}

export function getMetaString(report: Report): string {
  return getColumnSumDisplay(report, report.primaryColumnIndex);
}

export function createEmptyRow(columns: ReportColumn[], dateOverride?: string | null): ReportRow {
  const values: CellValue[] = [];
  for (const col of columns) {
    if (col.type === "Date") {
      values.push({ kind: "Date", value: dateOverride ?? todayIso() });
    } else if (col.type === "FlexNumber") {
      values.push({ kind: "FlexNumber", originalValue: 0, multiplier: 1 });
    }
  }
  return { values };
}

/** Dòng mới khi nhân bản: FlexNumber trống; chỉ copy các cột Date từ dòng nguồn. */
export function createDuplicateRow(
  columns: ReportColumn[],
  source: ReportRow | null,
): ReportRow {
  const values: CellValue[] = [];
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    if (col.type === "Date") {
      let value = todayIso();
      if (source) {
        const vi = columnIndexToValueIndex(columns, ci);
        const cell = source.values[vi];
        if (cell?.kind === "Date") value = cell.value;
      }
      values.push({ kind: "Date", value });
    } else if (col.type === "FlexNumber") {
      values.push({ kind: "FlexNumber", originalValue: 0, multiplier: 1 });
    }
  }
  return { values };
}

export function createBatchRows(
  report: Report,
  selectedColumnIndex: number,
  numbers: number[],
  date: string | null,
): ReportRow[] {
  const firstDateCol = report.columns.findIndex((c) => c.type === "Date");
  return numbers.map((n) => {
    const row = createEmptyRow(report.columns, firstDateCol >= 0 ? date : null);
    const vi = columnIndexToValueIndex(report.columns, selectedColumnIndex);
    row.values[vi] = { kind: "FlexNumber", originalValue: n, multiplier: 1 };
    // Không có cột Date thì không gán date (createEmptyRow đã bỏ qua Date)
    if (firstDateCol >= 0 && date) {
      const dvi = columnIndexToValueIndex(report.columns, firstDateCol);
      row.values[dvi] = { kind: "Date", value: date };
    }
    return row;
  });
}

export function getCellAt(
  report: Report,
  row: ReportRow,
  columnIndex: number,
): CellValue | null {
  const col = report.columns[columnIndex];
  if (!col || col.type === "SummaryColumn") return null;
  const vi = columnIndexToValueIndex(report.columns, columnIndex);
  return row.values[vi] ?? null;
}

export function mapSelectedFlexCells(
  report: Report,
  selectedRowIndexes: number[],
  columnIndex: number,
  mapper: (cell: CellValueFlexNumber) => CellValueFlexNumber,
): ReportRow[] {
  return report.rows.map((row, ri) => {
    if (!selectedRowIndexes.includes(ri)) return row;
    const vi = columnIndexToValueIndex(report.columns, columnIndex);
    const cell = row.values[vi];
    if (!cell || cell.kind !== "FlexNumber") return row;
    const next = [...row.values];
    next[vi] = mapper(cell);
    return { values: next };
  });
}

export function mapSelectedDateCells(
  report: Report,
  selectedRowIndexes: number[],
  columnIndex: number,
  mapper: (cell: CellValueDate) => CellValueDate,
): ReportRow[] {
  return report.rows.map((row, ri) => {
    if (!selectedRowIndexes.includes(ri)) return row;
    const vi = columnIndexToValueIndex(report.columns, columnIndex);
    const cell = row.values[vi];
    if (!cell || cell.kind !== "Date") return row;
    const next = [...row.values];
    next[vi] = mapper(cell);
    return { values: next };
  });
}

/** Áp dụng mapper cho cột Date từ fromRowIndex đến hết bảng. */
export function mapDateCellsFromRowToEnd(
  report: Report,
  fromRowIndex: number,
  columnIndex: number,
  mapper: (cell: CellValueDate) => CellValueDate,
): ReportRow[] {
  return report.rows.map((row, ri) => {
    if (ri < fromRowIndex) return row;
    const vi = columnIndexToValueIndex(report.columns, columnIndex);
    const cell = row.values[vi];
    if (!cell || cell.kind !== "Date") return row;
    const next = [...row.values];
    next[vi] = mapper(cell);
    return { values: next };
  });
}

export function bumpDate(cell: CellValueDate, delta: number): CellValueDate {
  return { kind: "Date", value: addDaysIso(cell.value, delta) };
}

export function maxDateInSelectedRows(
  report: Report,
  selectedRowIndexes: number[],
  columnIndex: number,
): string | null {
  const dates: string[] = [];
  for (const ri of selectedRowIndexes) {
    const cell = getCellAt(report, report.rows[ri], columnIndex);
    if (cell?.kind === "Date") dates.push(cell.value);
  }
  return maxIsoDate(dates);
}

export function maxDateInFirstDateColumn(report: Report): string | null {
  const firstDateCol = report.columns.findIndex((c) => c.type === "Date");
  if (firstDateCol < 0) return null;
  const dates: string[] = [];
  for (const row of report.rows) {
    const cell = getCellAt(report, row, firstDateCol);
    if (cell?.kind === "Date") dates.push(cell.value);
  }
  return maxIsoDate(dates) ?? todayIso();
}

/** UUID v4 — hoạt động cả trên HTTP LAN (không phải secure context như localhost). */
export function newReportId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // non-secure context (vd. http://192.168.x.x)
    }
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  // version 4 + variant RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const DEFAULT_COLUMNS: ReportColumn[] = [
  { name: "Ngày", type: "Date" },
  { name: "Số tiền", type: "FlexNumber" },
];
