import Fastify from "fastify";
import cors from "@fastify/cors";
import { query } from "./db.js";
import { migrate } from "./migrate.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

await app.register(cors, { origin: true });
await migrate();

app.get("/health", async () => ({ ok: true }));

app.get("/settings", async () => {
  const { rows } = await query("SELECT key, value FROM settings");
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { splitter: settings.splitter ?? "hết" };
});

app.put("/settings", async (req, reply) => {
  const { splitter } = req.body ?? {};
  if (typeof splitter !== "string" || !splitter.trim()) {
    return reply.code(400).send({ error: "splitter không hợp lệ" });
  }
  await query(
    `INSERT INTO settings (key, value) VALUES ('splitter', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [splitter],
  );
  return { splitter };
});

app.get("/seasons", async () => {
  const { rows } = await query(
    `SELECT s.id, s.name, COUNT(r.id)::int AS "reportCount"
     FROM seasons s
     LEFT JOIN reports r ON r.season_id = s.id
     GROUP BY s.id, s.name
     ORDER BY s.id`,
  );
  return rows;
});

app.post("/seasons", async (req, reply) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return reply.code(400).send({ error: "Tên mùa không hợp lệ" });
  }
  const { rows } = await query(
    `INSERT INTO seasons (name) VALUES ($1)
     RETURNING id, name`,
    [name.trim()],
  );
  return rows[0];
});

app.put("/seasons/:id", async (req, reply) => {
  const id = Number(req.params.id);
  const name = req.body?.name;
  if (!Number.isInteger(id) || id <= 0) {
    return reply.code(400).send({ error: "id mùa không hợp lệ" });
  }
  if (typeof name !== "string" || !name.trim()) {
    return reply.code(400).send({ error: "Tên mùa không hợp lệ" });
  }
  const { rowCount } = await query(
    `UPDATE seasons SET name = $1 WHERE id = $2`,
    [name.trim(), id],
  );
  if (rowCount === 0) {
    return reply.code(404).send({ error: "Không tìm thấy mùa" });
  }
  return { id, name: name.trim() };
});

app.delete("/seasons", async (req, reply) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return reply.code(400).send({ error: "Thiếu danh sách id" });
  }
  const seasonIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (seasonIds.length === 0) {
    return reply.code(400).send({ error: "Danh sách id không hợp lệ" });
  }
  await query(
    `UPDATE reports SET season_id = NULL, updated_at = NOW()
     WHERE season_id = ANY($1::int[])`,
    [seasonIds],
  );
  await query(`DELETE FROM seasons WHERE id = ANY($1::int[])`, [seasonIds]);
  return { deleted: seasonIds.length };
});

const reportSelect = `
  SELECT id, name, primary_column_index AS "primaryColumnIndex",
         columns, rows, season_id AS "seasonId", updated_at AS "updatedAt"
  FROM reports`;

async function validateSeasonId(seasonId, reply) {
  if (seasonId == null) return true;
  if (typeof seasonId !== "number" || !Number.isInteger(seasonId)) {
    reply.code(400).send({ error: "seasonId không hợp lệ" });
    return false;
  }
  const { rows } = await query("SELECT 1 FROM seasons WHERE id = $1", [
    seasonId,
  ]);
  if (!rows[0]) {
    reply.code(400).send({ error: "Không tìm thấy mùa" });
    return false;
  }
  return true;
}

app.get("/reports", async () => {
  const { rows } = await query(
    `${reportSelect}
     ORDER BY updated_at DESC`,
  );
  return rows;
});

app.get("/reports/:id", async (req, reply) => {
  const { rows } = await query(`${reportSelect} WHERE id = $1`, [req.params.id]);
  if (!rows[0]) {
    return reply.code(404).send({ error: "Không tìm thấy báo cáo" });
  }
  return rows[0];
});

app.put("/reports/:id", async (req, reply) => {
  const body = req.body ?? {};
  const id = req.params.id;
  const name = body.name;
  const primaryColumnIndex = body.primaryColumnIndex;
  const columns = body.columns;
  const reportRows = body.rows;
  const seasonId = body.seasonId ?? null;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof primaryColumnIndex !== "number" ||
    !Array.isArray(columns) ||
    !Array.isArray(reportRows)
  ) {
    return reply.code(400).send({ error: "Dữ liệu báo cáo không hợp lệ" });
  }

  if (!(await validateSeasonId(seasonId, reply))) return;

  await query(
    `INSERT INTO reports (id, name, primary_column_index, columns, rows, season_id, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       primary_column_index = EXCLUDED.primary_column_index,
       columns = EXCLUDED.columns,
       rows = EXCLUDED.rows,
       season_id = EXCLUDED.season_id,
       updated_at = NOW()`,
    [
      id,
      name.trim(),
      primaryColumnIndex,
      JSON.stringify(columns),
      JSON.stringify(reportRows),
      seasonId,
    ],
  );

  return { id };
});

app.patch("/reports/season", async (req, reply) => {
  const ids = req.body?.ids;
  const seasonId = req.body?.seasonId ?? null;

  if (!Array.isArray(ids) || ids.length === 0) {
    return reply.code(400).send({ error: "Thiếu danh sách id báo cáo" });
  }
  if (!(await validateSeasonId(seasonId, reply))) return;

  const { rowCount } = await query(
    `UPDATE reports SET season_id = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[])`,
    [seasonId, ids],
  );
  return { updated: rowCount };
});

app.delete("/reports", async (req, reply) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return reply.code(400).send({ error: "Thiếu danh sách id" });
  }
  await query("DELETE FROM reports WHERE id = ANY($1::uuid[])", [ids]);
  return { deleted: ids.length };
});

app.delete("/reports/:id", async (req) => {
  await query("DELETE FROM reports WHERE id = $1", [req.params.id]);
  return { deleted: 1 };
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
