/** Mùa ảo cho báo cáo chưa gắn seasonId — không có trong bảng seasons. */
export const UNSET_SEASON_ID = 0;
export const UNSET_SEASON_NAME = "Không xác định";

export function isUnsetSeasonId(seasonId: number): boolean {
  return seasonId === UNSET_SEASON_ID;
}

export function seasonRouteId(seasonId: number | null | undefined): number {
  return seasonId ?? UNSET_SEASON_ID;
}

export function seasonDisplayName(
  seasonId: number,
  seasons: { id: number; name: string }[],
): string {
  if (isUnsetSeasonId(seasonId)) return UNSET_SEASON_NAME;
  return seasons.find((s) => s.id === seasonId)?.name ?? `Mùa #${seasonId}`;
}
