CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('splitter', 'hết')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS reports (
  id                   UUID PRIMARY KEY,
  name                 TEXT NOT NULL,
  primary_column_index INT NOT NULL,
  columns              JSONB NOT NULL,
  rows                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_updated_at_idx ON reports (updated_at DESC);
