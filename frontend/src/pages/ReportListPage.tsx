import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowLeftRight,
  FileSpreadsheet,
  Menu,
  Plus,
  Trash2,
} from "lucide-react";
import { AddReportDialog } from "@/components/AddReportDialog";
import { ChangeSeasonDialog } from "@/components/ChangeSeasonDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RenameSeasonDialog } from "@/components/RenameSeasonDialog";
import { exportReportsToZip, sanitizeFileName } from "@/domain/exportExcel";
import { formatAppVersion } from "@/domain/appVersion";
import {
  isUnsetSeasonId,
  seasonDisplayName,
} from "@/domain/season";
import { reportMeta, reportsForSeason, useAppStore } from "@/store/useAppStore";

export function ReportListPage() {
  const navigate = useNavigate();
  const { seasonId: seasonIdParam = "" } = useParams();
  const seasonId = Number(seasonIdParam);
  const seasonIdValid =
    seasonIdParam !== "" && Number.isInteger(seasonId) && seasonId >= 0;

  const allReports = useAppStore((s) => s.reports);
  const seasons = useAppStore((s) => s.seasons);
  const selectedReportIds = useAppStore((s) => s.selectedReportIds);
  const toggleReportSelection = useAppStore((s) => s.toggleReportSelection);
  const toggleSelectAllReports = useAppStore((s) => s.toggleSelectAllReports);
  const createReport = useAppStore((s) => s.createReport);
  const deleteReports = useAppStore((s) => s.deleteReports);
  const moveReportsToSeason = useAppStore((s) => s.moveReportsToSeason);
  const renameSeason = useAppStore((s) => s.renameSeason);

  const reports = useMemo(
    () => (seasonIdValid ? reportsForSeason(allReports, seasonId) : []),
    [allReports, seasonId, seasonIdValid],
  );

  const reportIdsInSeason = useMemo(
    () => reports.map((report) => report.id),
    [reports],
  );

  const selectedInSeason = useMemo(
    () => selectedReportIds.filter((id) => reportIdsInSeason.includes(id)),
    [selectedReportIds, reportIdsInSeason],
  );

  const allSelected =
    reports.length > 0 && selectedInSeason.length === reports.length;
  const someSelected =
    selectedInSeason.length > 0 && selectedInSeason.length < reports.length;

  const seasonName = seasonIdValid
    ? seasonDisplayName(seasonId, seasons)
    : "";

  const createSeasonId = seasonIdValid && !isUnsetSeasonId(seasonId)
    ? seasonId
    : null;

  const canRenameSeason = seasonIdValid && !isUnsetSeasonId(seasonId);

  const [showAdd, setShowAdd] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeSeason, setShowChangeSeason] = useState(false);
  const [showRenameSeason, setShowRenameSeason] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected, allSelected]);

  const closeMenu = () => setMenuOpen(false);

  const exportSelectedReports = async () => {
    const toExport = reports.filter((report) =>
      selectedInSeason.includes(report.id),
    );
    if (toExport.length === 0) return;

    closeMenu();
    setExporting(true);
    setExportError(null);
    try {
      await exportReportsToZip(
        toExport,
        sanitizeFileName(`Mua ${seasonName}`),
      );
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Export ZIP thất bại",
      );
    } finally {
      setExporting(false);
    }
  };

  if (!seasonIdValid) {
    return (
      <div className="app-shell">
        <main className="page-body">
          <div className="empty">Không tìm thấy mùa.</div>
        </main>
      </div>
    );
  }

  const selectionDisabled = selectedInSeason.length === 0 || exporting;

  return (
    <div className="app-shell page-with-fab">
      <header className="page-header">
        <div className="header-row">
          <button
            type="button"
            className="icon-btn page-back-btn"
            aria-label="Về danh sách mùa"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={20} />
          </button>
          {canRenameSeason ? (
            <button
              type="button"
              className="left header-title-btn"
              aria-label="Sửa tên mùa"
              title="Sửa tên mùa"
              onClick={() => setShowRenameSeason(true)}
            >
              <h1>Mùa {seasonName}</h1>
              <div className="meta">
                {reports.length} báo cáo · {formatAppVersion()}
              </div>
            </button>
          ) : (
            <div className="left">
              <h1>Mùa {seasonName}</h1>
              <div className="meta">
                {reports.length} báo cáo · {formatAppVersion()}
              </div>
            </div>
          )}
          <div className="header-bulk-actions">
            <input
              ref={selectAllRef}
              className="checkbox header-select-all"
              type="checkbox"
              checked={allSelected}
              disabled={reports.length === 0}
              onChange={() => toggleSelectAllReports(reportIdsInSeason)}
              aria-label={
                allSelected ? "Bỏ chọn tất cả báo cáo" : "Chọn tất cả báo cáo"
              }
            />
            <div className="header-menu" ref={menuRef}>
              <button
                type="button"
                className="icon-btn"
                aria-label="Menu thao tác"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                disabled={exporting}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Menu size={20} />
              </button>
              {menuOpen && (
                <div className="header-menu-panel" role="menu">
                  <button
                    type="button"
                    className="header-menu-item"
                    role="menuitem"
                    disabled={selectionDisabled}
                    onClick={() => {
                      closeMenu();
                      setShowChangeSeason(true);
                    }}
                  >
                    <ArrowLeftRight size={18} />
                    <span>Đổi mùa</span>
                  </button>
                  <button
                    type="button"
                    className="header-menu-item"
                    role="menuitem"
                    disabled={selectionDisabled}
                    onClick={() => void exportSelectedReports()}
                  >
                    <FileSpreadsheet size={18} />
                    <span>Export ZIP</span>
                  </button>
                  <button
                    type="button"
                    className="header-menu-item danger"
                    role="menuitem"
                    disabled={selectionDisabled}
                    onClick={() => {
                      closeMenu();
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 size={18} />
                    <span>Xóa báo cáo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="page-body">
        {exportError && (
          <p className="report-list-export-error" role="alert">
            {exportError}
          </p>
        )}
        {reports.length === 0 ? (
          <div className="empty">Chưa có báo cáo. Nhấn + để tạo mới.</div>
        ) : (
          <div className="list">
            {reports.map((report) => (
              <div key={report.id} className="list-item">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedReportIds.includes(report.id)}
                  onChange={() => toggleReportSelection(report.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Chọn ${report.name}`}
                />
                <button
                  type="button"
                  className="content"
                  style={{ textAlign: "left", background: "transparent", padding: 0 }}
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <p className="title">{report.name}</p>
                  <p className="subtitle">{reportMeta(report) || "—"}</p>
                </button>
              </div>
            ))}
            <div className="list-scroll-spacer" aria-hidden="true" />
          </div>
        )}
      </main>

      <button
        type="button"
        className="page-fab"
        aria-label="Thêm báo cáo"
        title="Thêm báo cáo"
        onClick={() => setShowAdd(true)}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showAdd && (
        <AddReportDialog
          onCancel={() => setShowAdd(false)}
          onCreate={(name, columns, primaryColumnIndex) => {
            createReport(name, columns, primaryColumnIndex, createSeasonId);
            setShowAdd(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Xóa báo cáo"
          message={`Xóa ${selectedInSeason.length} báo cáo đã chọn?`}
          danger
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deleteReports(selectedInSeason);
            setShowDeleteConfirm(false);
          }}
        />
      )}

      {showChangeSeason && (
        <ChangeSeasonDialog
          seasons={seasons}
          currentSeasonId={seasonId}
          reportCount={selectedInSeason.length}
          onCancel={() => setShowChangeSeason(false)}
          onConfirm={(targetSeasonId) => {
            moveReportsToSeason(selectedInSeason, targetSeasonId);
            setShowChangeSeason(false);
          }}
        />
      )}

      {showRenameSeason && canRenameSeason && (
        <RenameSeasonDialog
          initialName={seasonName}
          onCancel={() => setShowRenameSeason(false)}
          onSave={(name) => {
            renameSeason(seasonId, name);
            setShowRenameSeason(false);
          }}
        />
      )}
    </div>
  );
}
