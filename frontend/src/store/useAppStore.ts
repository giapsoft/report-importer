import { create } from "zustand";
import { api } from "@/api/client";
import {
  createBatchRows,
  createDuplicateRow,
  getMetaString,
  mapSelectedDateCells,
  mapDateCellsFromRowToEnd,
  mapSelectedFlexCells,
  bumpDate,
  maxDateInFirstDateColumn,
  maxDateInSelectedRows,
  newReportId,
} from "@/domain/report";
import type { Report, ReportColumn, ReportRow, Season } from "@/domain/types";
import { isUnsetSeasonId } from "@/domain/season";
import { todayIso } from "@/domain/format";

interface AppState {
  ready: boolean;
  loadError: string | null;
  splitter: string;
  seasons: Season[];
  reports: Report[];
  selectedReportIds: string[];
  selectedSeasonIds: number[];

  // detail selection (per session, not persisted)
  selectedColumnIndex: number;
  startShiftRowIndex: number;
  selectedRowIndexes: number[];

  hydrate: () => Promise<void>;
  setSplitter: (splitter: string) => void;
  createReport: (
    name: string,
    columns: ReportColumn[],
    primaryColumnIndex: number,
    seasonId: number | null,
  ) => void;
  deleteSelectedReports: () => void;
  deleteReports: (ids: string[]) => void;
  toggleReportSelection: (id: string) => void;
  toggleSelectAllReports: (ids: string[]) => void;
  clearReportSelection: () => void;
  createSeason: (name: string) => Promise<void>;
  renameSeason: (id: number, name: string) => void;
  deleteSelectedSeasons: () => void;
  toggleSeasonSelection: (id: number) => void;
  clearSeasonSelection: () => void;
  moveReportsToSeason: (reportIds: string[], seasonId: number | null) => void;
  renameReport: (id: string, name: string) => void;
  updateReport: (id: string, updater: (r: Report) => Report) => void;
  getReport: (id: string) => Report | undefined;

  // detail controller
  resetDetailSelection: () => void;
  toggleSelectedColumnIndex: (index: number) => void;
  /** Luôn chọn cột (dùng khi chạm ô trong bảng). */
  selectColumnIndex: (index: number) => void;
  /** Ô dữ liệu: chỉ chọn 1 dòng. */
  /** Ô dữ liệu: chọn 1 dòng. Cùng dòng khác cột thì giữ selected. */
  toggleRowSingle: (rowIndex: number, columnIndex: number) => void;
  /** Ô STT: chọn dải giữa 2 mốc (như Shift). */
  toggleRowRange: (index: number) => void;
  /** Header STT: chọn / bỏ chọn tất cả dòng. */
  toggleSelectAllRows: (rowCount: number) => void;
  clearRowSelection: () => void;
  /** Chọn đúng một dòng (dùng khi đọc số theo hàng). */
  selectSingleRow: (rowIndex: number) => void;
  insertRow: (reportId: string) => void;
  deleteSelectedRows: (reportId: string) => void;
  addZero: (reportId: string) => void;
  removeZero: (reportId: string) => void;
  updateOriginalValue: (reportId: string, originalValue: number) => void;
  increaseDate: (reportId: string) => void;
  decreaseDate: (reportId: string) => void;
  increaseDateBelow: (reportId: string) => void;
  decreaseDateBelow: (reportId: string) => void;
  setDate: (reportId: string, date: string) => void;
  applyBatch: (
    reportId: string,
    numbers: number[],
    date: string | null,
    /** Chèn ngay dưới dòng này; bỏ trống = thêm cuối danh sách. */
    insertAfterRowIndex?: number | null,
  ) => void;
  getMaxSelectedDate: (reportId: string) => string | null;
  getBatchDefaultDate: (reportId: string) => string | null;
}

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingReports = new Map<string, Report>();
let settingsTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReportPersist(report: Report) {
  pendingReports.set(report.id, report);
  const existing = persistTimers.get(report.id);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    report.id,
    setTimeout(() => {
      const payload = pendingReports.get(report.id);
      persistTimers.delete(report.id);
      pendingReports.delete(report.id);
      if (!payload) return;
      api.putReport(payload).catch((err) => {
        console.error("Lưu báo cáo thất bại", err);
      });
    }, 250),
  );
}

function scheduleSettingsPersist(splitter: string) {
  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    api.putSettings(splitter).catch((err) => {
      console.error("Lưu splitter thất bại", err);
    });
  }, 250);
}

function sortReports(reports: Report[]): Report[] {
  return [...reports].sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );
}

export function reportsForSeason(
  reports: Report[],
  seasonId: number,
): Report[] {
  if (isUnsetSeasonId(seasonId)) {
    return sortReports(reports.filter((r) => r.seasonId == null));
  }
  return sortReports(reports.filter((r) => r.seasonId === seasonId));
}

export function unsetReportCount(reports: Report[]): number {
  return reports.filter((r) => r.seasonId == null).length;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  loadError: null,
  splitter: "hết",
  seasons: [],
  reports: [],
  selectedReportIds: [],
  selectedSeasonIds: [],
  selectedColumnIndex: -1,
  startShiftRowIndex: -1,
  selectedRowIndexes: [],

  hydrate: async () => {
    try {
      const [settings, seasons, reports] = await Promise.all([
        api.getSettings(),
        api.listSeasons(),
        api.listReports(),
      ]);
      set({
        ready: true,
        loadError: null,
        splitter: settings.splitter || "hết",
        seasons,
        reports: sortReports(reports),
      });
    } catch (e) {
      set({
        ready: true,
        loadError: e instanceof Error ? e.message : "Không tải được dữ liệu",
      });
    }
  },

  setSplitter: (splitter) => {
    set({ splitter });
    scheduleSettingsPersist(splitter);
  },

  createReport: (name, columns, primaryColumnIndex, seasonId) => {
    const report: Report = {
      id: newReportId(),
      name: name.trim(),
      columns,
      primaryColumnIndex,
      rows: [],
      seasonId,
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ reports: [report, ...s.reports] }));
    scheduleReportPersist(report);
  },

  deleteSelectedReports: () => {
    const ids = get().selectedReportIds;
    get().deleteReports(ids);
  },

  deleteReports: (ids: string[]) => {
    if (ids.length === 0) return;
    set((s) => ({
      reports: s.reports.filter((r) => !ids.includes(r.id)),
      selectedReportIds: s.selectedReportIds.filter((id) => !ids.includes(id)),
    }));
    api.deleteReports(ids).catch((err) => {
      console.error("Xóa báo cáo thất bại", err);
    });
  },

  toggleReportSelection: (id) => {
    set((s) => ({
      selectedReportIds: s.selectedReportIds.includes(id)
        ? s.selectedReportIds.filter((x) => x !== id)
        : [...s.selectedReportIds, id],
    }));
  },

  toggleSelectAllReports: (ids) => {
    if (ids.length === 0) return;
    set((s) => {
      const allSelected = ids.every((id) => s.selectedReportIds.includes(id));
      if (allSelected) {
        const idSet = new Set(ids);
        return {
          selectedReportIds: s.selectedReportIds.filter((id) => !idSet.has(id)),
        };
      }
      return {
        selectedReportIds: [...new Set([...s.selectedReportIds, ...ids])],
      };
    });
  },

  clearReportSelection: () => set({ selectedReportIds: [] }),

  createSeason: async (name) => {
    const season = await api.createSeason(name);
    set((s) => ({ seasons: [...s.seasons, season] }));
  },

  renameSeason: (id, name) => {
    const trimmed = name.trim();
    set((s) => ({
      seasons: s.seasons.map((season) =>
        season.id === id ? { ...season, name: trimmed } : season,
      ),
    }));
    api.renameSeason(id, trimmed).catch((err) => {
      console.error("Đổi tên mùa thất bại", err);
    });
  },

  deleteSelectedSeasons: () => {
    const ids = get().selectedSeasonIds;
    if (ids.length === 0) return;
    set((s) => ({
      seasons: s.seasons.filter((season) => !ids.includes(season.id)),
      reports: s.reports.map((report) =>
        report.seasonId != null && ids.includes(report.seasonId)
          ? { ...report, seasonId: null }
          : report,
      ),
      selectedSeasonIds: [],
    }));
    api.deleteSeasons(ids).catch((err) => {
      console.error("Xóa mùa thất bại", err);
    });
  },

  toggleSeasonSelection: (id) => {
    set((s) => ({
      selectedSeasonIds: s.selectedSeasonIds.includes(id)
        ? s.selectedSeasonIds.filter((x) => x !== id)
        : [...s.selectedSeasonIds, id],
    }));
  },

  clearSeasonSelection: () => set({ selectedSeasonIds: [] }),

  moveReportsToSeason: (reportIds, seasonId) => {
    if (reportIds.length === 0) return;
    const idSet = new Set(reportIds);
    set((s) => {
      const reports = s.reports.map((report) => {
        if (!idSet.has(report.id)) return report;
        const next = {
          ...report,
          seasonId,
          updatedAt: new Date().toISOString(),
        };
        scheduleReportPersist(next);
        return next;
      });
      return {
        reports: sortReports(reports),
        selectedReportIds: s.selectedReportIds.filter((id) => !idSet.has(id)),
      };
    });
    api.moveReportsToSeason(reportIds, seasonId).catch((err) => {
      console.error("Đổi mùa báo cáo thất bại", err);
    });
  },

  renameReport: (id, name) => {
    get().updateReport(id, (r) => ({ ...r, name: name.trim() }));
  },

  updateReport: (id, updater) => {
    set((s) => {
      const reports = s.reports.map((r) => {
        if (r.id !== id) return r;
        const next = {
          ...updater(r),
          updatedAt: new Date().toISOString(),
        };
        scheduleReportPersist(next);
        return next;
      });
      return { reports: sortReports(reports) };
    });
  },

  getReport: (id) => get().reports.find((r) => r.id === id),

  resetDetailSelection: () =>
    set({
      selectedColumnIndex: -1,
      startShiftRowIndex: -1,
      selectedRowIndexes: [],
    }),

  toggleSelectedColumnIndex: (index) => {
    set((s) => ({
      selectedColumnIndex:
        s.selectedColumnIndex === index ? -1 : index,
    }));
  },

  selectColumnIndex: (index) => set({ selectedColumnIndex: index }),

  toggleRowSingle: (rowIndex, columnIndex) => {
    const { selectedRowIndexes, selectedColumnIndex } = get();
    // Trạng thái trước khi chạm (cơ sở so sánh)
    const previousRowIndexes = selectedRowIndexes;
    const previousColumnIndex = selectedColumnIndex;

    // Cùng 1 row, đổi cột → giữ nguyên selectedRowIndexes
    if (
      previousRowIndexes.length === 1 &&
      previousRowIndexes.includes(rowIndex) &&
      previousColumnIndex !== columnIndex
    ) {
      set({ startShiftRowIndex: -1 });
      return;
    }

    // Chọn qua ô dữ liệu (không phải STT) → xóa điểm neo
    if (previousRowIndexes.includes(rowIndex) && previousRowIndexes.length === 1) {
      set({ selectedRowIndexes: [], startShiftRowIndex: -1 });
    } else {
      set({
        startShiftRowIndex: -1,
        selectedRowIndexes: [rowIndex],
      });
    }
  },

  toggleRowRange: (index) => {
    const { startShiftRowIndex } = get();

    // Điểm neo chỉ set khi đang -1 và user chạm STT
    if (startShiftRowIndex < 0) {
      set({
        startShiftRowIndex: index,
        selectedRowIndexes: [index],
      });
      return;
    }

    // Giữ nguyên neo; chọn dải liên tiếp từ neo đến dòng vừa chạm
    const from = Math.min(index, startShiftRowIndex);
    const to = Math.max(index, startShiftRowIndex);
    const indexes: number[] = [];
    for (let i = from; i <= to; i++) indexes.push(i);
    set({ selectedRowIndexes: indexes });
  },

  toggleSelectAllRows: (rowCount) => {
    if (rowCount <= 0) {
      set({ selectedRowIndexes: [], startShiftRowIndex: -1 });
      return;
    }
    const { selectedRowIndexes } = get();
    const allSelected = selectedRowIndexes.length === rowCount;
    if (allSelected) {
      set({ selectedRowIndexes: [], startShiftRowIndex: -1 });
      return;
    }
    const indexes = Array.from({ length: rowCount }, (_, i) => i);
    // Chọn tất cả không phải chạm STT → không đặt neo
    set({ selectedRowIndexes: indexes, startShiftRowIndex: -1 });
  },

  clearRowSelection: () =>
    set({ selectedRowIndexes: [], startShiftRowIndex: -1 }),

  selectSingleRow: (rowIndex) =>
    set({ selectedRowIndexes: [rowIndex], startShiftRowIndex: -1 }),

  insertRow: (reportId) => {
    get().updateReport(reportId, (r) => {
      const selected = get().selectedRowIndexes;
      // Chèn ngay dưới dòng được chọn (hoặc cuối danh sách)
      const insertAt =
        selected.length > 0 ? Math.max(...selected) + 1 : r.rows.length;
      // Nhân bản: dòng trống, chỉ giữ ngày từ dòng ngay phía trên (nếu có)
      const source = insertAt > 0 ? r.rows[insertAt - 1] : null;
      const row = createDuplicateRow(r.columns, source);
      const rows = [...r.rows];
      rows.splice(insertAt, 0, row);
      return { ...r, rows };
    });
    // giữ selection, cập nhật index sau khi chèn
    set((s) => {
      const insertAt =
        s.selectedRowIndexes.length > 0
          ? Math.max(...s.selectedRowIndexes) + 1
          : -1;
      if (insertAt < 0) return s;
      return {
        selectedRowIndexes: s.selectedRowIndexes.map((i) =>
          i >= insertAt ? i + 1 : i,
        ),
      };
    });
  },

  deleteSelectedRows: (reportId) => {
    const selected = new Set(get().selectedRowIndexes);
    if (selected.size === 0) return;
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: r.rows.filter((_, i) => !selected.has(i)),
    }));
    set({ selectedRowIndexes: [], startShiftRowIndex: -1 });
  },

  addZero: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedFlexCells(r, selectedRowIndexes, selectedColumnIndex, (c) => ({
        ...c,
        multiplier: c.multiplier * 10,
      })),
    }));
  },

  removeZero: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedFlexCells(r, selectedRowIndexes, selectedColumnIndex, (c) => {
        if (c.multiplier > 1) {
          return {
            ...c,
            multiplier: Math.max(1, Math.trunc(c.multiplier / 10)),
          };
        }
        // multiplier đã = 1: chia originalValue cho 10 nếu chia hết
        if (c.originalValue % 10 === 0) {
          return {
            ...c,
            originalValue: Math.trunc(c.originalValue / 10),
            multiplier: 1,
          };
        }
        return c;
      }),
    }));
  },

  updateOriginalValue: (reportId, originalValue) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedFlexCells(r, selectedRowIndexes, selectedColumnIndex, () => ({
        kind: "FlexNumber",
        originalValue,
        multiplier: 1,
      })),
    }));
  },

  increaseDate: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedDateCells(r, selectedRowIndexes, selectedColumnIndex, (c) =>
        bumpDate(c, 1),
      ),
    }));
  },

  decreaseDate: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedDateCells(r, selectedRowIndexes, selectedColumnIndex, (c) =>
        bumpDate(c, -1),
      ),
    }));
  },

  increaseDateBelow: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    if (selectedRowIndexes.length === 0) return;
    const fromRow = Math.min(...selectedRowIndexes);
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapDateCellsFromRowToEnd(r, fromRow, selectedColumnIndex, (c) =>
        bumpDate(c, 1),
      ),
    }));
  },

  decreaseDateBelow: (reportId) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    if (selectedRowIndexes.length === 0) return;
    const fromRow = Math.min(...selectedRowIndexes);
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapDateCellsFromRowToEnd(r, fromRow, selectedColumnIndex, (c) =>
        bumpDate(c, -1),
      ),
    }));
  },

  setDate: (reportId, date) => {
    const { selectedColumnIndex, selectedRowIndexes } = get();
    get().updateReport(reportId, (r) => ({
      ...r,
      rows: mapSelectedDateCells(r, selectedRowIndexes, selectedColumnIndex, () => ({
        kind: "Date",
        value: date,
      })),
    }));
  },

  applyBatch: (reportId, numbers, date, insertAfterRowIndex = null) => {
    const { selectedColumnIndex } = get();
    if (selectedColumnIndex < 0 || numbers.length === 0) return;
    get().updateReport(reportId, (r) => {
      const newRows = createBatchRows(r, selectedColumnIndex, numbers, date);
      if (
        insertAfterRowIndex == null ||
        insertAfterRowIndex < 0 ||
        insertAfterRowIndex >= r.rows.length
      ) {
        return { ...r, rows: [...r.rows, ...newRows] };
      }
      const rows = [...r.rows];
      rows.splice(insertAfterRowIndex + 1, 0, ...newRows);
      return { ...r, rows };
    });
  },

  getMaxSelectedDate: (reportId) => {
    const report = get().getReport(reportId);
    if (!report) return null;
    const { selectedColumnIndex, selectedRowIndexes } = get();
    return (
      maxDateInSelectedRows(report, selectedRowIndexes, selectedColumnIndex) ??
      todayIso()
    );
  },

  getBatchDefaultDate: (reportId) => {
    const report = get().getReport(reportId);
    if (!report) return null;
    if (!report.columns.some((c) => c.type === "Date")) return null;
    return maxDateInFirstDateColumn(report);
  },
}));

export function reportMeta(report: Report): string {
  return getMetaString(report);
}

export type { Report, ReportColumn, ReportRow };
