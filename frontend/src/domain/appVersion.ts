/** Phiên bản app (package) — tăng khi đổi tính năng lớn. */
export const APP_VERSION = "1.0.0";

/** Mã build inject lúc compile (Docker / CI). */
export const BUILD_VERSION =
  typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";

/** Nhãn hiển thị trên UI, vd. "1.0.0 · build 34". */
export function formatAppVersion(): string {
  return `${APP_VERSION} · build ${BUILD_VERSION}`;
}
