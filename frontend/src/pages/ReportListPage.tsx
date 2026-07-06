import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowLeftRight,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import { AddReportDialog } from "@/components/AddReportDialog";
import { ChangeSeasonDialog } from "@/components/ChangeSeasonDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportReportDialog } from "@/components/ExportReportDialog";
import { RenameSeasonDialog } from "@/components/RenameSeasonDialog";
import type { Report } from "@/domain/types";
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
  const createReport = useAppStore((s) => s.createReport);
  const deleteReports = useAppStore((s) => s.deleteReports);
  const moveReportsToSeason = useAppStore((s) => s.moveReportsToSeason);
  const renameSeason = useAppStore((s) => s.renameSeason);

  const reports = useMemo(
    () => (seasonIdValid ? reportsForSeason(allReports, seasonId) : []),
    [allReports, seasonId, seasonIdValid],
  );

  const selectedInSeason = useMemo(
    () => selectedReportIds.filter((id) => reports.some((r) => r.id === id)),
    [selectedReportIds, reports],
  );

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
  const [exportReport, setExportReport] = useState<Report | null>(null);

  if (!seasonIdValid) {
    return (
      <div className="app-shell">
        <main className="page-body">
          <div className="empty">Không tìm thấy mùa.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
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
          <button
            type="button"
            className="icon-btn"
            aria-label="Đổi mùa cho báo cáo đã chọn"
            title="Đổi mùa"
            disabled={selectedInSeason.length === 0}
            onClick={() => setShowChangeSeason(true)}
          >
            <ArrowLeftRight size={20} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Thêm báo cáo"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={22} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Xóa báo cáo đã chọn"
            disabled={selectedInSeason.length === 0}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="page-body">
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
                <button
                  type="button"
                  className="icon-btn list-item-action"
                  aria-label={`Export Excel ${report.name}`}
                  title="Export Excel"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportReport(report);
                  }}
                >
                  <FileSpreadsheet size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

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

      {exportReport && (
        <ExportReportDialog
          report={exportReport}
          onClose={() => setExportReport(null)}
        />
      )}
    </div>
  );
}
