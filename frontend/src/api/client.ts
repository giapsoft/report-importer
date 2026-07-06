import type { Report, Season } from "@/domain/types";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SettingsDto {
  splitter: string;
}

export type ReportDto = Report;
export type SeasonDto = Season;

export const api = {
  getSettings: () => request<SettingsDto>("/settings"),
  putSettings: (splitter: string) =>
    request<SettingsDto>("/settings", {
      method: "PUT",
      body: JSON.stringify({ splitter }),
    }),
  listSeasons: () => request<SeasonDto[]>("/seasons"),
  createSeason: (name: string) =>
    request<SeasonDto>("/seasons", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameSeason: (id: number, name: string) =>
    request<SeasonDto>(`/seasons/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  deleteSeasons: (ids: number[]) =>
    request<{ deleted: number }>("/seasons", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
  listReports: () => request<ReportDto[]>("/reports"),
  moveReportsToSeason: (ids: string[], seasonId: number | null) =>
    request<{ updated: number }>("/reports/season", {
      method: "PATCH",
      body: JSON.stringify({ ids, seasonId }),
    }),
  putReport: (report: Report) =>
    request<{ id: string }>(`/reports/${report.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: report.name,
        primaryColumnIndex: report.primaryColumnIndex,
        columns: report.columns,
        rows: report.rows,
        seasonId: report.seasonId ?? null,
      }),
    }),
  deleteReports: (ids: string[]) =>
    request<{ deleted: number }>("/reports", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};
