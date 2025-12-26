CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  account_id TEXT PRIMARY KEY,
  holdings_json JSONB NOT NULL,
  positions_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_status (
  account_id TEXT PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ
);
