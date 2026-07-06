import { query } from "./db.js";

/** Chạy khi khởi động — bổ sung schema cho DB đã tạo trước khi có seasons. */
export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS seasons (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await query(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS season_id INT REFERENCES seasons (id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS reports_season_id_idx ON reports (season_id)
  `);
}
