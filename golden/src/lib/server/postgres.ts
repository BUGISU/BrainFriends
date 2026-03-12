import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[db] DATABASE_URL is not configured. Database writes are disabled.");
}

declare global {
  var __brainfriendsPgPool: Pool | undefined;
}

export function getDbPool(): Pool {
  if (!connectionString) {
    throw new Error("missing_database_url");
  }

  if (!global.__brainfriendsPgPool) {
    global.__brainfriendsPgPool = new Pool({
      connectionString,
      ssl:
        process.env.DATABASE_SSL === "require"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  return global.__brainfriendsPgPool;
}
