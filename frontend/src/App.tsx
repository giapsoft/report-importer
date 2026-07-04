import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ReportDetailPage } from "@/pages/ReportDetailPage";
import { ReportListPage } from "@/pages/ReportListPage";
import { useAppStore } from "@/store/useAppStore";

export function App() {
  const ready = useAppStore((s) => s.ready);
  const loadError = useAppStore((s) => s.loadError);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!ready) {
    return <div className="loading">Đang tải…</div>;
  }

  if (loadError) {
    return (
      <div className="error-box">
        Không kết nối được máy chủ: {loadError}
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ReportListPage />} />
      <Route path="/reports/:id" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
