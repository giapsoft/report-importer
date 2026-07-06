import { formatDateDdMmYyyy } from "./format";
import {
  flexValue,
  getCellAt,
  getSummaryValue,
} from "./report";
import type { Report } from "./types";

/** Định dạng số nguyên có phân cách hàng nghìn (Excel dùng token chuẩn #,##0). */
const NUMBER_FORMAT = "#,##0";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ");
  return cleaned || "bao-cao";
}

function sheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:\[\]]/g, " ").trim();
  return (cleaned || "Bao cao").slice(0, 31);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function uniqueXlsxName(baseName: string, used: Map<string, number>): string {
  const count = (used.get(baseName) ?? 0) + 1;
  used.set(baseName, count);
  if (count === 1) return `${baseName}.xlsx`;
  return `${baseName} (${count}).xlsx`;
}

/** Tạo buffer Excel cho một báo cáo. */
export async function buildReportExcelBuffer(
  report: Report,
  columnIndexes: number[],
): Promise<ArrayBuffer> {
  const indexes = columnIndexes
    .filter((i) => i >= 0 && i < report.columns.length)
    .sort((a, b) => a - b);

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Quản lý báo cáo";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName(report.name));

  const headers = ["STT", ...indexes.map((i) => report.columns[i].name)];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let ri = 0; ri < report.rows.length; ri++) {
    const row = report.rows[ri];
    const excelRow = sheet.addRow([]);

    const sttCell = excelRow.getCell(1);
    sttCell.value = ri + 1;
    sttCell.alignment = { horizontal: "center" };

    indexes.forEach((colIndex, offset) => {
      const cell = excelRow.getCell(offset + 2);
      const col = report.columns[colIndex];

      if (col.type === "Date") {
        const dateCell = getCellAt(report, row, colIndex);
        cell.value =
          dateCell?.kind === "Date"
            ? formatDateDdMmYyyy(dateCell.value)
            : "";
        cell.alignment = { horizontal: "center" };
        return;
      }

      if (col.type === "FlexNumber") {
        const numCell = getCellAt(report, row, colIndex);
        const n =
          numCell?.kind === "FlexNumber" ? flexValue(numCell) : 0;
        cell.value = n;
        cell.numFmt = NUMBER_FORMAT;
        cell.alignment = { horizontal: "right" };
        return;
      }

      const n = getSummaryValue(report, row, colIndex);
      cell.value = n;
      cell.numFmt = NUMBER_FORMAT;
      cell.alignment = { horizontal: "right" };
    });
  }

  sheet.getColumn(1).width = 8;
  indexes.forEach((colIndex, offset) => {
    const nameLen = report.columns[colIndex].name.length;
    sheet.getColumn(offset + 2).width = Math.min(28, Math.max(12, nameLen + 4));
  });

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

/**
 * Tạo file Excel từ báo cáo.
 * Luôn có cột STT đầu tiên; chỉ export các cột trong columnIndexes (theo thứ tự chọn / thứ tự cột gốc).
 */
export async function exportReportToExcel(
  report: Report,
  columnIndexes: number[],
): Promise<void> {
  const indexes = columnIndexes
    .filter((i) => i >= 0 && i < report.columns.length)
    .sort((a, b) => a - b);

  if (indexes.length === 0) {
    throw new Error("Chọn ít nhất một cột để export");
  }

  const buffer = await buildReportExcelBuffer(report, indexes);
  downloadBlob(
    new Blob([buffer], { type: XLSX_MIME }),
    `${sanitizeFileName(report.name)}.xlsx`,
  );
}

/** Export nhiều báo cáo (tất cả cột) vào một file zip. */
export async function exportReportsToZip(
  reports: Report[],
  archiveBaseName = "bao-cao",
): Promise<void> {
  if (reports.length === 0) {
    throw new Error("Không có báo cáo để export");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const report of reports) {
    const columnIndexes = report.columns.map((_, index) => index);
    const buffer = await buildReportExcelBuffer(report, columnIndexes);
    const entryName = uniqueXlsxName(
      sanitizeFileName(report.name),
      usedNames,
    );
    zip.file(entryName, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${sanitizeFileName(archiveBaseName)}.zip`);
}
