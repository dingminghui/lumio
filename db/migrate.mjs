import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function loadEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch {
    // .env.local is optional; docker-compose defaults are enough for local use.
  }
}

async function isInitialSchemaPresent(sql) {
  const [result] = await sql`
    select
      to_regclass('public.projects') is not null
      and to_regclass('public.project_sessions') is not null
      and to_regclass('public.session_messages') is not null
      and to_regtype('public.session_message_role') is not null as exists
  `;

  return result.exists;
}

await loadEnvFile(".env.local");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://lumio:lumio@localhost:5432/lumio";
const migrationsDir = path.join(process.cwd(), "db", "migrations");
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__lumio_migrations (
      id serial primary key,
      name text not null unique,
      applied_at timestamp with time zone not null default now()
    )
  `;

  const appliedRows = await sql`select name from drizzle.__lumio_migrations`;
  const appliedMigrations = new Set(appliedRows.map((row) => row.name));
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    if (file.startsWith("0000_") && (await isInitialSchemaPresent(sql))) {
      await sql`insert into drizzle.__lumio_migrations ${sql({ name: file })}`;
      console.log(`marked existing migration ${file}`);
      continue;
    }

    const contents = await readFile(path.join(migrationsDir, file), "utf8");
    const statements = contents
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }

      await tx`insert into drizzle.__lumio_migrations ${tx({ name: file })}`;
    });

    console.log(`applied migration ${file}`);
  }
} finally {
  await sql.end();
}
