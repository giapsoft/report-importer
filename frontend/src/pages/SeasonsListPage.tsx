import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { AddSeasonDialog } from "@/components/AddSeasonDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatAppVersion } from "@/domain/appVersion";
import {
  UNSET_SEASON_ID,
  UNSET_SEASON_NAME,
} from "@/domain/season";
import { unsetReportCount, reportsForSeason, useAppStore } from "@/store/useAppStore";

export function SeasonsListPage() {
  const navigate = useNavigate();
  const seasons = useAppStore((s) => s.seasons);
  const reports = useAppStore((s) => s.reports);
  const selectedSeasonIds = useAppStore((s) => s.selectedSeasonIds);
  const createSeason = useAppStore((s) => s.createSeason);
  const deleteSelectedSeasons = useAppStore((s) => s.deleteSelectedSeasons);
  const toggleSeasonSelection = useAppStore((s) => s.toggleSeasonSelection);

  const unsetCount = unsetReportCount(reports);

  const dbItems = useMemo(
    () =>
      seasons.map((season) => ({
        id: season.id,
        name: season.name,
        reportCount: reportsForSeason(reports, season.id).length,
      })),
    [seasons, reports],
  );

  const [showAdd, setShowAdd] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="app-shell">
      <header className="page-header">
        <div className="header-row">
          <div className="left">
            <h1>Danh sách Mùa</h1>
            <div className="meta">
              {seasons.length} mùa · {formatAppVersion()}
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Thêm mùa"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={22} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Xóa mùa đã chọn"
            disabled={selectedSeasonIds.length === 0}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="page-body">
        {dbItems.length === 0 && unsetCount === 0 ? (
          <div className="empty">Chưa có mùa nào. Nhấn + để tạo mới.</div>
        ) : (
          <div className="list">
            {dbItems.map((season) => (
              <div key={season.id} className="list-item">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedSeasonIds.includes(season.id)}
                  onChange={() => toggleSeasonSelection(season.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Chọn ${season.name}`}
                />
                <button
                  type="button"
                  className="content"
                  style={{
                    textAlign: "left",
                    background: "transparent",
                    padding: 0,
                    width: "100%",
                  }}
                  onClick={() => navigate(`/seasons/${season.id}`)}
                >
                  <p className="title">{season.name}</p>
                  <p className="subtitle">{season.reportCount} báo cáo</p>
                </button>
              </div>
            ))}
            <div className="list-item">
              <button
                type="button"
                className="content"
                style={{
                  textAlign: "left",
                  background: "transparent",
                  padding: 0,
                  width: "100%",
                  marginLeft: 28,
                }}
                onClick={() => navigate(`/seasons/${UNSET_SEASON_ID}`)}
              >
                <p className="title">{UNSET_SEASON_NAME}</p>
                <p className="subtitle">
                  {unsetCount} báo cáo · chưa gắn mùa
                </p>
              </button>
            </div>
          </div>
        )}
      </main>

      {showAdd && (
        <AddSeasonDialog
          onCancel={() => setShowAdd(false)}
          onCreate={async (name) => {
            await createSeason(name);
            setShowAdd(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Xóa mùa"
          message={`Xóa ${selectedSeasonIds.length} mùa đã chọn? Các báo cáo trong mùa sẽ chuyển sang「${UNSET_SEASON_NAME}」.`}
          danger
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deleteSelectedSeasons();
            setShowDeleteConfirm(false);
          }}
        />
      )}
    </div>
  );
}
