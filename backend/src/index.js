import Fastify from "fastify";
import cors from "@fastify/cors";
import { query } from "./db.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

await app.register(cors, { origin: true });

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

app.get("/reports", async () => {
  const { rows } = await query(
    `SELECT id, name, primary_column_index AS "primaryColumnIndex",
            columns, rows, updated_at AS "updatedAt"
     FROM reports
     ORDER BY updated_at DESC`,
  );
  return rows;
});

app.get("/reports/:id", async (req, reply) => {
  const { rows } = await query(
    `SELECT id, name, primary_column_index AS "primaryColumnIndex",
            columns, rows, updated_at AS "updatedAt"
     FROM reports WHERE id = $1`,
    [req.params.id],
  );
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

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof primaryColumnIndex !== "number" ||
    !Array.isArray(columns) ||
    !Array.isArray(reportRows)
  ) {
    return reply.code(400).send({ error: "Dữ liệu báo cáo không hợp lệ" });
  }

  await query(
    `INSERT INTO reports (id, name, primary_column_index, columns, rows, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       primary_column_index = EXCLUDED.primary_column_index,
       columns = EXCLUDED.columns,
       rows = EXCLUDED.rows,
       updated_at = NOW()`,
    [
      id,
      name.trim(),
      primaryColumnIndex,
      JSON.stringify(columns),
      JSON.stringify(reportRows),
    ],
  );

  return { id };
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
