import { getAuthenticatedSessionContext } from "@/lib/server/accountAuth";
import { getDbPool } from "@/lib/server/postgres";
import type { ManagedStorageScope } from "@/lib/storage/managedStorage";

type DraftRowsByScope = Record<ManagedStorageScope, Record<string, string>>;

let ensureDraftsTablePromise: Promise<void> | null = null;

async function ensureTrainingDraftsTable() {
  if (!ensureDraftsTablePromise) {
    ensureDraftsTablePromise = (async () => {
      const pool = getDbPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS training_client_drafts (
          user_id UUID NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
          storage_scope VARCHAR(10) NOT NULL,
          draft_key VARCHAR(200) NOT NULL,
          draft_value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, storage_scope, draft_key)
        )
      `);
    })().catch((error) => {
      ensureDraftsTablePromise = null;
      throw error;
    });
  }

  await ensureDraftsTablePromise;
}

async function getAuthenticatedDraftContext(sessionToken: string) {
  const context = await getAuthenticatedSessionContext(sessionToken);
  if (!context) {
    throw new Error("unauthorized");
  }
  await ensureTrainingDraftsTable();
  return context;
}

export async function listTrainingDraftsForAuthenticatedUser(
  sessionToken: string,
): Promise<DraftRowsByScope> {
  const context = await getAuthenticatedDraftContext(sessionToken);
  const pool = getDbPool();
  const result = await pool.query(
    `
      SELECT storage_scope, draft_key, draft_value
      FROM training_client_drafts
      WHERE user_id = $1
    `,
    [context.userId],
  );

  const rows: DraftRowsByScope = {
    local: {},
    session: {},
  };

  for (const row of result.rows) {
    const scope =
      String(row.storage_scope) === "session" ? "session" : "local";
    rows[scope][String(row.draft_key)] = String(row.draft_value);
  }

  return rows;
}

export async function upsertTrainingDraftForAuthenticatedUser(
  sessionToken: string,
  scope: ManagedStorageScope,
  key: string,
  value: string,
) {
  const context = await getAuthenticatedDraftContext(sessionToken);
  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO training_client_drafts (
        user_id,
        storage_scope,
        draft_key,
        draft_value,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, storage_scope, draft_key) DO UPDATE
      SET draft_value = EXCLUDED.draft_value,
          updated_at = NOW()
    `,
    [context.userId, scope, key, value],
  );
}

export async function deleteTrainingDraftForAuthenticatedUser(
  sessionToken: string,
  scope: ManagedStorageScope,
  key: string,
) {
  const context = await getAuthenticatedDraftContext(sessionToken);
  const pool = getDbPool();
  await pool.query(
    `
      DELETE FROM training_client_drafts
      WHERE user_id = $1
        AND storage_scope = $2
        AND draft_key = $3
    `,
    [context.userId, scope, key],
  );
}
