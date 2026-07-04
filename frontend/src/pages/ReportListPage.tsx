import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { AddReportDialog } from "@/components/AddReportDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { reportMeta, useAppStore } from "@/store/useAppStore";

export function ReportListPage() {
  const navigate = useNavigate();
  const reports = useAppStore((s) => s.reports);
  const selectedReportIds = useAppStore((s) => s.selectedReportIds);
  const toggleReportSelection = useAppStore((s) => s.toggleReportSelection);
  const createReport = useAppStore((s) => s.createReport);
  const deleteSelectedReports = useAppStore((s) => s.deleteSelectedReports);

  const [showAdd, setShowAdd] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="app-shell">
      <header className="page-header">
        <div className="header-row">
          <div className="left">
            <h1>Quản lý báo cáo</h1>
            <div className="meta">{reports.length} báo cáo</div>
          </div>
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
            disabled={selectedReportIds.length === 0}
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
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddReportDialog
          onCancel={() => setShowAdd(false)}
          onCreate={(name, columns, primaryColumnIndex) => {
            createReport(name, columns, primaryColumnIndex);
            setShowAdd(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Xóa báo cáo"
          message={`Xóa ${selectedReportIds.length} báo cáo đã chọn?`}
          danger
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deleteSelectedReports();
            setShowDeleteConfirm(false);
          }}
        />
      )}
    </div>
  );
}
